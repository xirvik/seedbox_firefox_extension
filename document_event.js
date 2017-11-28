if(typeof(net) == "undefined") var net = {};
if(!net.xirvik) net.xirvik = {};
net.xirvik.seedbox = (function(my) 
{
	my.contextmenu = 
	{
		init: function()
		{
			document.body.addEventListener("mousedown",  this.onMouseDown, true );
		},
		
		onMouseDown: function(e)
		{
			if( (e.which==1) && !e.metaKey && !e.shiftKey && !e.ctrlKey && !e.altKey && my.extension.options.enabled )
			{
				var target = e.target;
				while( target && target.tagName && (target.tagName.toLowerCase() != "a") )
					target = target.parentNode;			
				if(target && target.href)
				{
					var isMagnet = target.href.match(/^magnet:/i);
					if( my.extension.options.click && isMagnet )
					{
				        	e.preventDefault();
						e.stopPropagation();
						chrome.runtime.sendMessage( { type: 'loadmagnet', url: target.href } );	
						return(false);
					}
				}					
			}				
		},
	};
	
	my.theFileCache = 
	{
		server: null,
		url: null,
		entries: {},
		basedir: null,

		init: function( server, basedir, dirlist )
		{
			this.basedir = my.addslash(basedir);
			this.server = server;
			this.url = my.addslash(this.server.url)+"plugins/_getdir/info.php?mode=dirlist&basedir=";
			this.entries = {};
			this.entries[''] = dirlist;
		},

		get: function( basedir, callback )
		{
			basedir = my.normalize(basedir);		
			if(this.entries[basedir])
				callback( basedir, this.entries[basedir] );
			else
			{
				var timeout = setTimeout( function() { $.fancybox.showLoading(); }, 500 );
				my.ajax(
				{
					url: this.url+encodeURIComponent(my.theFileCache.basedir+basedir),
					base: this.url,
					user: this.server.user,
			                pass: this.server.pass,
					success: function( ret )
					{
						clearTimeout(timeout);
						$.fancybox.hideLoading();
						var directory = my.addslash(ret.basedir.substr(my.theFileCache.basedir.length));
						my.theFileCache.entries[directory] = ret.dirlist;
						callback( directory, ret.dirlist );
					},
					error: function(status)
					{
						clearTimeout(timeout);					
						$.fancybox.hideLoading();					
						if( my.getOption('messagedf') )
							my.standardErrorHandling(status,my.theFileCache.url);
					}
				});
			}
		}
	},

	my.dialogs = 
	{
		init: function()
		{
			chrome.runtime.onMessage.addListener( this.onDialog );
		},

		fillDirList: function( basedir, dirlist )
		{
			basedir = my.normalize(basedir);
			$('.xirvik-dlg fieldset #directory').val(basedir);
			for( var i in dirlist )
			{
				var dir = dirlist[i];
				$('.xirvik-dlg fieldset label#dirlist').append( $('<label>').text(dir) );
			}
			$('.xirvik-dlg fieldset label#dirlist label').click( function()
			{
				$('.xirvik-dlg fieldset label#dirlist label').removeClass('active');
				$(this).addClass('active');
				$('.xirvik-dlg fieldset #directory').val(basedir+$(this).text());
			});
			$('.xirvik-dlg fieldset label#dirlist label').dblclick( function()
			{
				if( $(this).text() != '.')
				{
					$('.xirvik-dlg fieldset label#dirlist').empty();
					my.theFileCache.get( basedir+$(this).text(), my.dialogs.fillDirList );
				}					
			});
		},

		onDialog: function(request, sender, sendResponse)
		{
			if(request.type=='dialog')
			{
				if( (my.extension.options.servers.length==1) && (request.name=='seedboxes') )
				{
					sendResponse( { index: 0 } );
				}
				else
				{
	                		$.fancybox(
        	        		{
						type: 'ajax',
						openEffect: 'none',
						closeEffect: 'none',
						href: chrome.extension.getURL(request.name+'.html'),
						minHeight: 50,
						width: 400,
						closeBtn: false,
						scrolling: false,
						autoCenter: true,
						helpers:  
						{
					        	overlay : 
					        	{ 
					        		closeClick : false,
					        		css: { background: 'none' }
					        	}
	    					},
						beforeShow: function(links, index)
        	            			{
							my.i18n();
                	    				for( var i in my.extension.options.servers )
                    					{
                    						var server = my.extension.options.servers[i];
                    						var name = server.descr.length ? server.descr : my.getHost(server.url)+ " (" + server.client + ")";
								$('.xirvik-dlg #seedboxes').append($('<option>', { value : i  }).text(name));
							}
							if( request.labels )
							{
								var founded = false;
								for( var i in request.labels )
								{
									var label = request.labels[i];
									var txt = (label.length>23) ? label.substr(0,20)+'...' : label;
									$('.xirvik-dlg #existinglabels').append($('<option>', { value : label }).text(txt));
									founded = true;
								}
								if(!founded)
									$('.xirvik-dlg #existinglabels_cont').hide();
							}
							else
								$('.xirvik-dlg #labels').hide();
							if( request.dirlist )
							{
								my.theFileCache.init( request.server, request.basedir, request.dirlist)
							        my.dialogs.fillDirList( '', request.dirlist );
							}
							else
								$('.xirvik-dlg #directories').hide();
							$('.xirvik-dlg #torrents_start_stopped').attr('checked',my.extension.options.nostart);
							$('.xirvik-dlg button.cancel').click( function()
							{
								$.fancybox.close();
							});
							$('.xirvik-dlg button.ok').click( function()
							{
								switch(request.name)
								{
									case 'seedboxes':
									{
										sendResponse( { index: $('.xirvik-dlg #seedboxes').val() } );
										break;
	                                                                }
        	                                                        case 'upload_options':
                	                                                {
										var label = $.trim($('.xirvik-dlg #newlabel').val());
										if(!label.length)
											label = $('.xirvik-dlg #existinglabels').val();
									        if(!label)
									        	label = '';
										var dir = $.trim($('.xirvik-dlg #directory').val());
										sendResponse( 
										{ 
											'label': label, 
											'directory': dir, 
											'fast_resume': $('.xirvik-dlg #fast_resume').is(":checked"),
											'torrents_start_stopped': $('.xirvik-dlg #torrents_start_stopped').is(":checked"),
											'not_add_path': $('.xirvik-dlg #not_add_path').is(":checked"),
										} );
                        	                                        	break;
                                	                                }
								}
								$.fancybox.close();							
							});						
        	           			}
	                		});
				}
                		return(true);
			}
		}
	};

	my.extension.load( function()
	{
		my.dialogs.init();
		$(document).ready( function()
		{
			my.contextmenu.init();
		});
	});

	return(my);
})(net.xirvik.seedbox || {});