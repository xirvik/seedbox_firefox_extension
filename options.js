if(typeof(net) == "undefined") var net = {};
if(!net.xirvik) net.xirvik = {};
net.xirvik.seedbox = (function(my) 
{
	my.options = 
	{
		init: function()
		{
			my.i18n();
			$("#tabs").tabs();
	                $("#save").click(function() 
	                { 
	                	my.options.save();
	                });
	                $("#call-parser").click(function() 
	                { 
	                	my.options.parse();
	                });
			$("#call-wizard").click(function() 
			{ 
				my.options.wizard();
			});
			$("#add-server").click(function() 
			{ 
				my.options.addServer(); 
			});
			$("#edit-server").click(function() 
			{ 
				my.options.editServer(); 
			});
			$("#test-server").click(function() 
			{ 	
				my.options.testServer(); 
			});
                	$("#remove-server").click(function() 
                	{ 
                		my.options.removeServer(); 
                	});
			my.extension.load( function()
			{
	                	my.options.fill();
                	});
                	$(window).on('beforeunload', function()
                	{
				return(my.options.closeNotification());
                	});
		},

		setButtonState: function()
		{
			$("#edit-server, #test-server, #remove-server").prop('disabled', $("#servers tr.current").length==0);
		},
		
		setRows: function()
		{
			var rows = $("#servers tr:not(.header)");
			rows.off("mouseenter mouseleave").hover(function()
                       	{
                        	$("td", this).css({ backgroundColor: "#D0D0D0" });
                       	}, function()
                       	{
				$("td", this).css({ backgroundColor: $(this).hasClass("current") ? "" : "white" });
                        });
			rows.off("click").click(function()
                        {
				$("#servers tr.current").removeClass("current");
                            	$(this).addClass("current");
				my.options.setButtonState();
                        });
			rows.off("dblclick").dblclick(function()
                        {
				$("#servers tr.current").removeClass("current");
                            	$(this).addClass("current");
                            	my.options.editServer();
                        });
                        my.options.setButtonState();
		},

		addServersLine: function( server )
		{
			if(server.url)
			{
				server.deluge_pass = server.deluge_pass || 'deluge';
              			$("#servers").append(
              				$("<tr>").append(
               					$("<td>").attr("width","50%").text(server.url)).append(
               					$("<td>").attr("width","25%").text(server.user)).append(
                     				$("<td>").attr("width","25%").text(server.client)).data(server));
			}
		},
		
		closeHint: function()
		{
			$("#entry .hint").hide();
			$(".fancybox-inner input, .fancybox-inner select").prop("disabled",false);
			$(".fancybox-inner").css( { background: "#f9f9f9" } );
			$.fancybox.update();
		},

		show: function( popup )
		{
			$("#entry .cancel").off("click").on("click", function()
                	{
				$.fancybox.close();
			});

			$.fancybox(
			{
				type: "inline",
                    		content: $('#entry'),
				height: 400,
				width: 350,
				padding: 0,
				closeBtn: false,
				openEffect: 'none',
				closeEffect: 'none',				
				helpers:  
				{
				        overlay : null
				},
				beforeClose: my.options.closeHint
			});

                	$("#entry .hint_button").off('click').on('click', function()
                	{
	                	my.options.closeHint();
                		$(this).parent().next().css( { left: $(this).position().left-6, top: $(this).position().top-6 } );
				$(this).parent().next().show();
				$(".fancybox-inner input, .fancybox-inner select").prop("disabled",true);
				$(".fancybox-inner").css( { background: "#CCC" } );
				$(".hint_close",$(this).parent().next()).off('click').on('click', my.options.closeHint);
				$.fancybox.update();
                	});

                	$("#entry #entry_client").off("change").on("change", function()
                	{
	                	$(".custom_options").hide();
                		$('#'+$(this).val()+'_options').show();
               			$.fancybox.update();
                	});
                	$("#entry #entry_client").change();

                	$('#directory_selection, #label_selection').off("change").on("change", function()
                	{
                		if( $(this).val()=="Permanent" )
                		{
					$('button',$(this).prev().prev()).show();
	                		$('a',$(this).prev()).off('click').on('click', my.options.pasteMe);
                			$(this).next().next().show();
               			}
                		else
                		{
	                		$('button',$(this).prev().prev()).hide();
                			$(this).next().next().hide();
               			}
               			$.fancybox.update();
                	});
                	$('#directory_selection, #label_selection').change();

			$("#entry input#entry_host").focus();		
		},
		
		pasteMe: function(e)
		{
			var input = $(e.currentTarget).parent().parent().parent().next().next().next();
			input.val( input.val()+e.currentTarget.textContent );
		},

		correctPromo: function()
		{
			var servers = [];
			$("#servers tr:not(.header)").each(function()
                	{
				servers.push( $(this).data() );
			});
			if(my.isXivikConfiguration(servers))
			{
				$("#promos").prop('disabled',false);
			}
			else					
			{
				$("#promos").prop('checked',true);
				$("#promos").prop('disabled',true);
			}
			my.options.showSaveIndicator();
		},		

		fill: function()
		{
			for(var i = 0; i < my.extension.options.servers.length; i++)
               	        	this.addServersLine( my.extension.options.servers[i] );
			this.setRows();               	        	
			$("#click-capture").prop('checked',my.extension.options.click);
			$("#progress-messagesf").prop('checked',my.extension.options.messagesf);
			$("#progress-messagest").prop('checked',my.extension.options.messagest);
			$("#progress-messageds").prop('checked',my.extension.options.messageds);
			$("#progress-messagedf").prop('checked',my.extension.options.messagedf);
			$("#progress-messageus").prop('checked',my.extension.options.messageus);
			$("#progress-messageuc").prop('checked',my.extension.options.messageuc);
			$("#progress-messageuf").prop('checked',my.extension.options.messageuf);
			$("#upload-nostart").prop('checked',my.extension.options.nostart);
			$("#console").prop('checked',my.extension.options.console);
			$("#promos").prop('checked',my.isXivikConfiguration() ? my.extension.options.promos : true);
			$("#enabled").prop('checked',my.extension.options.enabled);
			$("#upload-timeout").val(my.extension.options.timeout);
			$(["#context-capture-on", "#context-capture-force", "#context-capture-off"][my.extension.options.capture]).prop("checked", true);
			this.correctPromo();
			$(".ui-tabs-panel input").on('input', my.options.showSaveIndicator);
		},

		showSaveIndicator: function()
		{
			if(my.options.isModified())
			{
				$('#save_indicator').text( my.t('unsaved_changes') );
				$('#save').prop('disabled',false);
			}
			else
			{
				$('#save_indicator').text( '' );
				$('#save').prop('disabled',true);
			}
		},

		isModified: function()
		{
			return(JSON.stringify(my.extension.options) != JSON.stringify($.extend(true, {}, my.extension.options, my.options.saveOptions())));
		},

		closeNotification: function()
		{
			if( my.options.isModified() )
			{
				return( my.t('close_notification') );
			}
		},

		saveOptions: function()
		{
			var options = 
			{
				click: $("#click-capture").prop('checked'),
				messagesf: $("#progress-messagesf").prop('checked'),
				messagest: $("#progress-messagest").prop('checked'),
				messageds: $("#progress-messageds").prop('checked'),
				messagedf: $("#progress-messagedf").prop('checked'),
				messageus: $("#progress-messageus").prop('checked'),
				messageuc: $("#progress-messageuc").prop('checked'),
				messageuf: $("#progress-messageuf").prop('checked'),
				nostart: $("#upload-nostart").prop('checked'),
				console: $("#console").prop('checked'),
				promos: $("#promos").prop('checked'),
				enabled: $("#enabled").prop('checked'),
				timeout: parseInt($("#upload-timeout").val()),
				capture: $("#context-capture-on").prop('checked') ? 0 :
					$("#context-capture-force").prop('checked') ? 1 : 2,
				servers: []
			};
			$("#servers tr:not(.header)").each(function()
                	{
				options.servers.push( $(this).data() );
			});
			if(!my.isXivikConfiguration(options.servers))
				options.promos = true;
			return(options);
		},

		save: function()
		{
		        my.extension.options = my.options.saveOptions();
			my.extension.store( function() 
			{ 
				$(window).off('beforeunload');
				if(chrome.runtime.lastError) 
				{
					 my.extension.showNotification( my.t('error'), chrome.runtime.lastError.message );
				}
				else
				{
					chrome.tabs.getCurrent(function(tab) 
					{
						chrome.tabs.remove(tab.id, function() {});
					});
				}
			} );
		},

		addServer: function()
		{
			$("#entry input").val("");
			$("#entry select").each( function()
			{
				$("option:eq(0)",$(this)).prop("selected", true);
			});

			$("#entry select").change();
			$("#entry .save").off("click").on("click", function()
                	{
                		my.options.addServersLine(
                		{
                			url: $("#entry input#entry_host").val(),
					user: $("#entry input#entry_user").val(),
					pass: $("#entry input#entry_pass").val(),
					descr: $("#entry input#entry_description").val(),
					client: $("#entry select#entry_client").val(),
					label_type: $("#entry select#label_selection").val(),
					label: $("#entry input#permanent_label").val(),
					dir_type: $("#entry select#directory_selection").val(),
					dir: $("#entry input#permanent_directory").val(),
					deluge_pass: $("#entry input#webui_password").val()
				});
				my.options.setRows();
				$.fancybox.close();
				my.options.correctPromo();
			});
			my.options.setButtonState();
                	this.show();
		},

		editServer: function()
		{
			var row = $("#servers tr.current")
			var server = row.data();
			$("#entry input#entry_host").val(server.url);
			$("#entry input#entry_user").val(server.user);
			$("#entry input#entry_pass").val(server.pass);
			$("#entry input#entry_description").val(server.descr);
			$("#entry select#entry_client").val(server.client);
			$("#entry select#label_selection").val(server.label_type);
			$("#entry input#permanent_label").val(server.label);
			$("#entry select#directory_selection").val(server.dir_type);
			$("#entry input#permanent_directory").val(server.dir);
			$("#entry input#webui_password").val(server.deluge_pass);
			$("#entry select").change();

			$("#entry .save").off("click").on("click", function()
                	{
                		server = 
                		{
                			url: $("#entry input#entry_host").val(),
                			user: $("#entry input#entry_user").val(),
                			pass: $("#entry input#entry_pass").val(),
                			descr: $("#entry input#entry_description").val(),
                			client: $("#entry select#entry_client").val(),
					label_type: $("#entry select#label_selection").val(),
					label: $("#entry input#permanent_label").val(),
					dir_type: $("#entry select#directory_selection").val(),
					dir: $("#entry input#permanent_directory").val(),
					deluge_pass: $("#entry input#webui_password").val()
                		};
				row.data(server);
				row.find("td:eq(0)").text(server.url);
				row.find("td:eq(1)").text(server.user);
				row.find("td:eq(2)").text(server.client);
				$.fancybox.close();
				my.options.correctPromo();
                	});

                	this.show();
		},

		removeServer: function()
		{
			$("#servers tr.current").remove();
			my.options.setButtonState();
			my.options.correctPromo();
		},

		testServer: function()
		{
			$.fancybox(
			{
				type: "html",
				minWidth: 0,
				minHeight: 0,
				width: 0,
				height: 0,
				margin: 0,
				padding: 0,
				autoSize: false,
				content: '&nbsp;',
				closeBtn: false,
				openEffect: 'none',
				closeEffect: 'none',
				helpers:  
				{
				        overlay: 
				        {
				        	closeClick: false
				        }
				},
			});		
			$.fancybox.showLoading();
			var server = $("#servers tr.current").data();
			my.ajax( 
			{
				url: server.url,
				base: server.url,
				user: server.user,
				pass: server.pass,
				success: function()
				{
					$.fancybox.hideLoading();
					$.fancybox.close();
					my.extension.showNotification( my.t('info'), my.t('test_passed'), server.url );
				},
				error: function( status )
				{
					$.fancybox.hideLoading();
					$.fancybox.close();
					var msg = my.t('test_failed');
					switch(status)
					{
						case 401:
						{
							msg += my.t('bad_credentials');
							break;
						}	
						case 0:
						{
							msg += my.t('server_unreacheable');
							break;								
						}
						case -1:
						{
							msg += my.t('timeout_reached');
							break;							
						}
						default:
						{
							msg += my.t('servers_response') + status;
							break;
						}
					}
					my.extension.showNotification( my.t('error'), msg, server.url );
				}
			});
		},

		wizard: function()
		{
			var wizbox = $("#wizard");
			$("#wiz_type").off("change").on("change", function()
                	{
				$(".selected", wizbox).hide();
				$(".selected." + $(this).val(), wizbox).show();
                	});
                	$("#wiz_type").change();

			$(".wizard_next").off("click").on("click", function()
                	{
                    		$(".wiz_1st", wizbox).hide();
				$(".wiz_2nd input", wizbox).val("");
				$(".wiz_2nd", wizbox).show();
				$.fancybox.update();
                	});

                	$("#wizard .cancel").off("click").on("click", function()
                	{
				$.fancybox.close();
			});

			$(".wizard_done").off("click").on("click", function()
                	{
				var type = $("#wiz_type").val();
                		var server = 
                		{
					host: $(".wiz_2nd input#wiz_host").val(),
					user: $(".wiz_2nd input#wiz_user").val(),
					pass: $(".wiz_2nd input#wiz_pass").val(),
					descr: "",
					deluge_pass: "deluge",
					client: "rutorrent",
					url: 'https://'+$(".wiz_2nd input#wiz_host").val()+'/rtorrent'
				};					
				switch(type)
                    		{
					case "Shared":
		                        case "Semidedicated":
		                        {
						my.options.addServersLine(server);
						break;						
		                        }
		                        case "Dedicated":
		                        {
						my.options.addServersLine(server);
						server.client = "torrentflux-b4rt";
						server.url = 'https://'+server.host+'/tfx/';
						my.options.addServersLine(server);
						server.client = "utorrent";
						server.url = 'http://'+server.host+':5010/gui';
						my.options.addServersLine(server);
						server.client = "deluge";
						server.url = 'https://'+server.host+'/deluge';
						my.options.addServersLine(server);
						break;
		                        }
				}
				my.options.setRows();
				my.options.correctPromo();
				$.fancybox.close();
			});

			$(".wiz_2nd, #parser", wizbox).hide();
			$(".wiz_1st", wizbox).show();

			$.fancybox(
			{
				type: "inline",
				content: $("#wizard"),
				height: 500,
				width: 350,
				maxWidth: 350,				
				padding: 0,
				closeBtn: false,
				scrolling: false,
				openEffect: 'none',
				closeEffect: 'none',				
				helpers:  
				{
				        overlay : null
				},				
				afterClose: function()
                    		{
					$(".wiz_2nd, #parser", wizbox).hide();
					$(".wiz_1st", wizbox).show();
					wizbox.hide();
                    		}
                	});
		},
		
		parse: function()
		{
			var wizbox = $("#wizard");
                        $("#parser_text").val("");
                        $("#parser .parse", wizbox).off("click").on("click", function()
                        {
				var text = $("#parser_text").val();
				var host = "";
				var user = "";
				var pass = "";

				var h1_ = text.indexOf("URL:") + 4;
				var h2_ = text.indexOf("Username:", h1_);

				if((h1_ != -1) && (h2_ != -1))
				{
					host = $.trim(text.substring(h1_, h2_));
					if(host.indexOf('http://')==0)
						host = host.substr(7);
					else
					if(host.indexOf('https://')==0)
						host = host.substr(8);			                    	
				}

				var u1_ = text.indexOf("Username:", h2_) + 9;
				var u2_ = text.indexOf("Password:", u1_);

				if((u1_ != -1) && (u2_ != -1))
					user = $.trim(text.substring(u1_, u2_));

				var p1_ = u2_ + 10;
				var p2_ = text.indexOf("\n", p1_);
				if(p2_ == -1)
					p2_ = text.indexOf("\r", p1_);
				if((p1_ != -1) && (p2_ != -1))
					pass = $.trim(text.substring(p1_, p2_));

				$(".wiz_2nd input#wiz_host").val(host);
				$(".wiz_2nd input#wiz_user").val(user);
				$(".wiz_2nd input#wiz_pass").val(pass);

				$(".wiz_2nd", wizbox).show();
				$("#parser", wizbox).hide();
				$.fancybox.update();
                        });

                        $("#parser .cancel", wizbox).off("click").on("click", function()
                        {
				$(".wiz_2nd", wizbox).show();
				$("#parser", wizbox).hide();
				$.fancybox.update();
                        });

                        $(".wiz_2nd", wizbox).hide();
                        $("#parser", wizbox).show();

			$.fancybox.update();
		}

	};

	document.addEventListener( "DOMContentLoaded", my.options.init );	

	return(my);

})(net.xirvik.seedbox || {});