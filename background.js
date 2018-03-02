if(typeof(net) == "undefined") var net = {};
if(!net.xirvik) net.xirvik = {};
net.xirvik.seedbox = (function(my) 
{
	my.extension = 
	{
		try_no: 0,

		options: my.conf.default_options,
		uploadFuncs:
		{
			"rutorrent": 'ruTorrentUpload',
			"rutorrent 3.x": 'ruTorrentUpload',
			"deluge": 'delugeUpload',
			"torrentflux-b4rt": 'torrentFluxUpload',
			"utorrent": 'uTorrentUpload',
			"qbittorrent": 'qBittorrentUpload'
		},

		ruTorrentUpload: function( server, options )
		{
			var formData = new FormData();
			formData.append("dir_edit", options.directory);
			formData.append("label", options.label);
			if(options['torrents_start_stopped'])
				formData.append("torrents_start_stopped","on");
			if(options['not_add_path'])
				formData.append("not_add_path","on");
			if(options['fast_resume'])
				formData.append("fast_resume","on");				
			if(options.magnet)
				formData.append("url", options.data);
			else
			{
				formData.append("torrent_file", options.data, options.name);
			}
			my.ajax(
			{
				'url': my.addslash(server.url)+'php/addtorrent.php',
				base: server.url,
                        	user: server.user,
                        	pass: server.pass,
				method: 'POST',
				data: formData,
				success: my.standardSuccessHandling,
				error: function( status )
				{
					if(my.getOption('messageuf'))					
						my.standardErrorHandling(status,server.url,my.t("torrent_upload_fail"));
				}
			});
		},

		qBittorentGetFilters: function()
		{
			var ret = { urls: [] };
			for( var i in this.qBittorrentFilteredURLs )
				ret.urls.push( i+'*' );
			return(ret);
		},

		qBittorentSetupFilters: function(url)
		{
			if( !this.qBittorrentFilteredURLs[url] )
			{
				this.qBittorrentFilteredURLs[url] = true;
				if(chrome.webRequest.onBeforeSendHeaders.hasListener(this.changeReferer))
					chrome.webRequest.onBeforeSendHeaders.removeListener(this.changeReferer);
				chrome.webRequest.onBeforeSendHeaders.addListener(this.changeReferer, this.qBittorentGetFilters(),
					["requestHeaders", "blocking"] );
			}
		},

		changeReferer: function(details)
		{
			details.requestHeaders.push(
			{
				name: 'Referer',
				value: details.url
			});
			details.requestHeaders.push(
			{
				name: 'Origin',
				value: details.url
			});
			return(
			{
				requestHeaders: details.requestHeaders
			});
		},

		qBittorrentUpload: function( server, options )
		{
			var url = my.addslash(server.url);
			this.qBittorentSetupFilters(url);
			my.ajax(
			{
				'url': url+'login',
				base: server.url,
				method: 'POST',
				data: "username="+encodeURIComponent(server.user)+"&password="+encodeURIComponent(server.pass),
				headers:
				{
					"Content-Type": "application/x-www-form-urlencoded"
				},
				error: function( status )
				{
					if(my.getOption('messageuf'))					
						my.standardErrorHandling(status, server.url, my.t("torrent_upload_fail"));
				},
				success: function()
				{
					var path = null;
					var formData = new FormData();
					if(options['torrents_start_stopped'])
						formData.append("paused","true");
					if(options.magnet)
					{
						formData.append("urls", options.data);
						path = 'command/download';
					}
					else
					{
						formData.append("torrents", options.data, options.name);
						path = 'command/upload';
					}
					my.ajax(
					{
						'url': url+path,
						base: server.url,
						method: 'POST',
						data: formData,
						success: my.standardSuccessHandling,
						error: function( status )
						{
							if(my.getOption('messageuf'))					
								my.standardErrorHandling(status,server.url,my.t("torrent_upload_fail"));
						}
					});
				}
			});
		},

		delugeUpload: function( server, options )
		{
			var url = my.addslash(server.url);

			var addTorrent2Deluge = function( contents )
			{
				my.ajax(
				{
					'url': url+'json',
					base: server.url,
	                        	user: server.user,
        	                	pass: server.pass,					
					method: 'POST',
					data: JSON.stringify(
					{
						method: 'web.add_torrents',
						params: 
						[[{
							path: contents,
							options: 
							{
								add_paused: my.getOption("nostart"),
							}
						}]],
						id: 155
					}),
					headers:
					{
						"Content-Type": "application/json", 
					},
					success: function( json, req, options )
					{
						if(json.result)
						{
							if(my.getOption("messageuc"))
								my.notify("info","torrent_uploaded", server.url);
						}
						else
							my.standardErrorHandling(-2, server.url);
					},
					error: function( status )
					{
						if(my.getOption('messageuf'))					
							my.standardErrorHandling(status, server.url, my.t("torrent_upload_fail"));
					}
				});
			};

			my.ajax(
			{
				'url': url+'json',
				base: server.url,
                        	user: server.user,
       	                	pass: server.pass,
				method: 'POST',
				data: "{\"method\":\"auth.login\",\"params\":[\""+server.deluge_pass+"\"],\"id\":2}",
				headers:
				{
					"Content-Type": "application/json", 
				},
				error: function( status )
				{
					if(my.getOption('messageuf'))					
						my.standardErrorHandling(status, server.url, my.t("torrent_upload_fail"));
				},
				success: function( json )
				{
					if( json.result )
					{
						if(options.magnet)
							addTorrent2Deluge( options.data );
						else
						{
							var formData = new FormData();
							formData.append("file", options.data, options.name);
							my.ajax(
							{
								'url': url+'upload',
								base: server.url,
				                        	user: server.user,
       	                					pass: server.pass,						
								method: 'POST',
                                			        data: formData,
								error: function( status )
								{
									if(my.getOption('messageuf'))					
										my.standardErrorHandling(status, server.url, my.t("torrent_upload_fail"));
								},
								success: function( json )
								{
									if(json.success)
										addTorrent2Deluge( json["files"][0] );
									else
										my.standardErrorHandling(-2, server.url);
								}
							});
						}
					}
					else
						my.standardErrorHandling(-2, server.url);
				}
			});
		},

		torrentFluxUpload: function( server, options )
		{
			if(options.magnet)
			{
				if( my.getOption('messageuf') )
				{
					my.notify('error',"tflux_not_support",server.url);	
				}
			}
			else
			{
				var formData = new FormData();
        		        formData.append("aid", 2);
       		        	formData.append("client", server.user);
        		        formData.append("upload_files[]", options.data, options.name+'.torrent');
				my.ajax(
	                        {
					'url': my.addslash(server.url)+'dispatcher.php?action=fileUpload',
					base: server.url,
	                        	user: server.user,
	                        	pass: server.pass,
					method: 'POST',
					data: formData,
					success: my.standardSuccessHandling,
					error: function( status )
					{
						if(my.getOption('messageuf'))					
							my.standardErrorHandling(status, server.url, my.t("torrent_upload_fail"));
					}							
				});
			}
		},

		uTorrentUpload: function( server, options )
		{
			var url = my.addslash(server.url);
			my.ajax(
			{
                        	'url': url+"token.html",
                        	base: server.url,
                        	user: server.user,
                        	pass: server.pass,                        	
				success: function( data, req )
				{
					var token = req.responseText.match(/<html><div id='token' style='display:none;'>(.*)<\/div><\/html>/);
					if( token )
					{
						var formData = null;
						url += "?token=";
	                	                url += encodeURIComponent(token[1]);
						if(options.magnet)
                               	                {
                                       	        	url += "&action=add-url&s=";
                                               		url += encodeURIComponent(options.data);
                                                }
						else
						{
							url += "&action=add-file";
                	                                formData = new FormData();
       	                	                        formData.append("torrent_file", options.data, options.name);
						}
                                              	my.ajax(
		                                {
			                        	'url': url,
			                        	base: server.url,
                        				user: server.user,
			                        	pass: server.pass,
                                                        method: 'POST',
       	                                        	'data': formData,
							success: my.standardSuccessHandling,
							error: function( status )
							{
								if(my.getOption('messageuf'))					
									my.standardErrorHandling(status, server.url, my.t("torrent_upload_fail"));
							}
                                       	        });
					}
					else
						my.standardErrorHandling(-2, server.url);
				},
				error: function( status )
				{
					if(my.getOption('messageuf'))					
						my.standardErrorHandling(status, server.url, my.t("torrent_upload_fail"));
				}
			});				
		},

		openURL: function( url )
		{
			chrome.tabs.query( { url: my.addslash(url), currentWindow: true }, function(tabs) 
			{
				if(tabs.length)
					chrome.tabs.update(tabs[0].id, { active: true });
				else
					chrome.tabs.create({"url" : url});
			});			
		},

		onPromoClick: function()
		{
			my.storage.get('promo1', function( promo )
			{
				promo = promo || { url: null, clicked: false, modified: null };
				if(promo.url)
				{
					promo.clicked = true;
					my.storage.put('promo1', promo);
					chrome.tabs.create({"url" : promo.url});
				}
			});
		},

		isXivikConfiguration: function()
		{
			return(my.isXivikConfiguration(my.extension.options.servers));
		},

		isPromoShow: function()
		{
			return( (!my.extension.isXivikConfiguration() || my.getOption("promos")) && my.getOption("enabled") );
		},

		promoThread: function()
		{
			if(my.extension.isPromoShow())
			{
				my.storage.get('promo1', function( promo )
				{
					var promo = promo || { url: null, clicked: false, modified: null };
					my.ajax(
					{
						url: my.conf.promoURL + "?" + new Date().getTime(),
						ifModifiedSince: promo.modified,

						success: function( data, req )
						{
							var nfo = req.responseText.split('\n');
							if(nfo.length>=3)
							{
								my.storage.put('promo1', { url: my.trim(nfo[2]), clicked: false, modified: req.getResponseHeader("Last-Modified") });
								my.extension.showNotification( my.trim(nfo[0]), my.trim(nfo[1]), my.trim(nfo[2]), true );
							}
						}
					});
				});
			}
		},

		setOptions: function(options)
		{
			if(options)
				this.options = options;
			my.storage.put("options",this.options);
			chrome.tabs.query( {}, function(tabs) 
			{
				for(var i = 0; i < tabs.length; i++)
				{
					chrome.tabs.sendMessage(tabs[i].id, { type: "optionschanged", options: my.extension.options } , function()
					{
						if(chrome.runtime.lastError) 
						{
//							 console.warn("Whoops.. " + chrome.runtime.lastError.message);
						}
					});
				}
			});
			my.extension.options['enabled'] ? chrome.browserAction.enable() : chrome.browserAction.disable();
		},

		onContextMenu: function(e)
		{
			var server = null;
			for(var i = 0; i < my.extension.options.servers.length; i++)
			{
				if(my.extension.options.servers[i].menu==e.menuItemId)
				{
					server = my.extension.options.servers[i];
					break;
				}
			}
			if(server)
			{
				chrome.tabs.query( { currentWindow: true, active: true }, function( tabs )
				{
					my.extension.transfer( server, { data: e.linkUrl, id: tabs[0].id } );
				});
			}				
		},
		
		createContextMenuItem: function(index,root)
		{
			var server = this.options.servers[index];
			var name = server.descr.length ? server.descr : my.getHost(server.url)+ " (" + server.client + ")";
			if(this.options.servers.length==1)
				name = my.t("upload_to")+name;
			var options = 
        	        {
				title: name, 
				contexts: ["link"],
				onclick: this.onContextMenu,
				parentId: root
			};
			if(this.options.capture==0)
				options.targetUrlPatterns = ["*://*/*.torrent*"];				
			server.menu = chrome.contextMenus.create( options );
		},

		makeMenu: function()
		{
			chrome.contextMenus.removeAll();
			if((this.options.capture<=1) && this.options.enabled)
			{
				if(this.options.servers.length==1)
					this.createContextMenuItem(0);
                	        else
                        	{
					var options =
					{
						type: "normal", 
						title: my.t("upload_to_seedbox"), 
						contexts: ["link"]
					};
					if(this.options.capture==0)
						options.targetUrlPatterns = ["*://*/*.torrent*"];
					var root = chrome.contextMenus.create( options, function()
	                            	{
        	                        	for(var i = 0; i < my.extension.options.servers.length; i++)
							my.extension.createContextMenuItem(i,root);
					});
	                        }
			}
			chrome.contextMenus.create(
			{
				title: my.t("enable"), 
				contexts: ["browser_action"],
				type: "checkbox",
				checked: my.getOption('enabled'),
				onclick: function(info) 
				{
					my.extension.options['enabled'] = info.checked;
					my.extension.setOptions();
					my.extension.makeMenu();
      				}
			});
		},

		requestHandler: function(request, sender, sendResponse)
		{
			switch(request.type)
			{
				case 'setoptions':
				{
					my.extension.setOptions( request.options );
					my.extension.makeMenu();
				}			
				case 'getoptions':
				{
					sendResponse( my.extension.options );
					break;
				}
				case 'loadmagnet':
				{
					my.extension.retrieveServer( sender.tab.id, request.url );
					break;				
				}
				case 'notification':
				{
					my.extension.showNotification( request.theme, request.text, request.url );
				}
			}
		},
		
		showNotification: function( theme, text, url, isPromo )
		{
			chrome.notifications.create(
			{
			 	title: theme,
				type: "basic",
				message: text,
				iconUrl: chrome.extension.getURL("images/xirvik-32.png")
			}, function(id)
			{
				my.extension.notifications[id] = { promo: isPromo, url: url };
				if(!isPromo)
				{ 
					setTimeout( function()
					{
						chrome.notifications.clear(id);
						delete my.extension.notifications[id];
					}, my.conf.notificationDelay);
				}
			});
		},

		download: function( options, callback, server )
		{
			if(options.magnet = ((typeof(options.data)=="string") && options.data.match(/^magnet:/i)))
				callback(options);
			else
			{
				if( my.getOption('messageds') )
					my.notify('info','starting_torrent_download', server.url);
				my.ajax(
				{
					'url': options.data,
					responseType: 'blob',

					success: function(dummy, xhr)
					{
						options.name = 'dummy.torrent';
						var hdr = xhr.getResponseHeader("Content-Disposition");
 						if(hdr)
	 					{
							hdr = hdr.match(/filename="(.*)"/);
							if(hdr)
								options.name = hdr[1];
						}
						options.url = options.data;						
						options.data = xhr.response;
						my.bencode( options.data, function( info )
						{
							options.info = info;
							callback(options);
						},
						function()
						{
							if( my.getOption('messagedf') )
								my.standardErrorHandling(-2, server.url, my.t("download_not_torrent"));
						});
						
					},
					error: function(status)
					{
						if( my.getOption('messagedf') )
							my.standardErrorHandling(status, server.url, my.t("download_error"));
					}
				});
			}
		},

		transfer: function( server, options )
		{
			my.extension.download( options, function(options)
			{
				my.extension.retrieveOptions( server, options, my.extension.upload );
			}, server);		
		},
		
		retrieveServer: function( tabId, url )
		{
			chrome.tabs.sendMessage(tabId, { type: "dialog", name: "seedboxes" }, function(data)
			{
				if(data)
				{
					var server = my.extension.options.servers[data.index];
					my.extension.transfer( server, { data: url, id: tabId } );
				}					
			});
		},			

		retrieveOptions: function( server, options, callback )
		{
			options.torrents_start_stopped = my.getOption("nostart");
			switch(server.client)
			{
				case "rutorrent":
				case "rutorrent 3.x":
				{
					var replacement = {};
					if(!options.magnet)
					{
						if((server.dir_type=="Permanent") || (server.label_type=="Permanent"))
							replacement = options.info;
						replacement['{HOST}'] = my.getHost(options.url);							
					}
					replacement['{DATE}'] = (new Date()).toISOString().substr(0,10);
					replacement['{HOST}'] = replacement['{HOST}'] || '';
					replacement['{TRACKER}'] = replacement['{TRACKER}'] || '';
					replacement['{CREATION}'] = replacement['{CREATION}'] || '';

				        if(server.dir_type=="Permanent")
				        {
				        	options.directory = server.dir;	
				        	for(var i in replacement)
				        	{
				        		var r = new RegExp(i,'ig');
				        		options.directory = options.directory.replace( r, replacement[i] );
				        	}
				        }
				        else
						options.directory = '';
				        if(server.label_type=="Permanent")
				        {
				        	options.label = server.label;
				        	for(var i in replacement)
				        	{
				        		var r = new RegExp(i,'ig');
				        		options.label = options.label.replace( r, replacement[i] );
				        	}
				        }
				        else
						options.label = '';

					var modes = [];
					if( (server.dir_type=="At runtime") || (server.dir_type=="Permanent") )
						modes.push("dirlist");
					if(server.label_type=="At runtime")
						modes.push("labels");
					if( modes.length )
					{
						my.ajax(
						{
							'url': my.addslash(server.url)+"plugins/_getdir/info.php?mode="+modes.join(";"),
							base: server.url,
                        				user: server.user,
			                        	pass: server.pass,
							success: function( ret )
							{
								ret["basedir"] = ret["basedir"] || "";
								if( (server.label_type=="At runtime") || (server.dir_type=="At runtime") )
								{
									var props = 
									{
										type: "dialog", 
										name: "upload_options",
									};
									if(server.label_type=="At runtime")
										props.labels = ret.labels;
									if(server.dir_type=="At runtime")
									{
										props.dirlist = ret.dirlist;
										props.basedir = ret.basedir;
										props.server = server;
									}

									chrome.tabs.sendMessage(options.id, props, function(data)
									{
										if(data)
										{
											options.label = data.label || options.label;
											options.directory = data.directory.length ? my.addslash(ret.basedir)+data.directory : my.addslash(ret.basedir)+options.directory;
											options.torrents_start_stopped = data.torrents_start_stopped;
											options.fast_resume = data.fast_resume;
											options.not_add_path = data.not_add_path;
											callback(server,options);
										}											
									});
								}
								else
								{
									options.directory = my.addslash(ret.basedir)+options.directory;
									callback(server,options);
								}
							},
							error: function( status )
							{
								callback(server,options);
							}
						});
						break;
					}
				}
				default:
				{
					callback(server,options);
					break;					
				}
			}
		},
		
		upload: function( server, options )
		{
			if(my.getOption('messageus'))
				my.notify('info','starting_torrent_upload',server.url);
			if( my.extension.uploadFuncs[server.client] )
			{
				my.extension[my.extension.uploadFuncs[server.client]]( server, options );
			}
			else
				if(my.getOption('messageuf'))
					my.notify('error','Upload function not found.',server.url);
		},
		
		configInProgress: false,

		parseConfigXML: function( xml, user, pass )
		{
			xml = xml.documentElement;
		        if((xml.nodeName == "autoconf") && (xml.getAttribute("name") == "xirvik"))
			{
				var servers = xml.getElementsByTagName("server");
				var success = 0;
				for(var i = 0; i < servers.length; i++)
				{
					var server = servers[i];
					var optiontags = server.getElementsByTagName("option");
					var host = "", username = "", passwd = "", description = "", client = "";
					for(var k = 0; k < optiontags.length; k++)
					{
                        			var value = optiontags[k].getAttribute("value");
						switch(optiontags[k].getAttribute("name"))
                        			{
				                        case "host":
				                        {
					                        host = value;
					                        break;
							}
				                        case "username":
				                        {
					                        username = value;
					                        break;
							}
				                        case "pass":
				                        {
					                        passwd = value;
					                        break;
							}
				                        case "description":
				                        {
					                        description = value;
					                        break;
							}
				                        case "client":
				                        {
					                        client = (value=='rutorrent 3.x') ? 'rutorrent' : value;
					                        break;
        				                }
						}
                       			}
					var tmphost = host;
                                        if( (!tmphost.length || (tmphost == "/") || (tmphost == "\\")) &&
						!window.confirm("[" + host + "]: "+my.t('seedbox_incorrect_path')) )
                                                return;
                                        if(!i)
					{
						tmphost = my.getHost(tmphost);

						var found = false;
						for(var j = 0; j < my.extension.options.servers.length; j++)
                                            	{
							if( my.getHost(my.extension.options.servers[j].url)==tmphost )
                                                	{
                                                		found = true;
								break;
                                                	}
						}
						if(found && !window.confirm("[" + tmphost + "]: "+my.t('seedbox_data_found')))
							return;

						for(var j = 0; j < my.extension.options.servers.length; )
						{
							if( my.getHost(my.extension.options.servers[j].url)==tmphost )
								my.extension.options.servers.splice(j, 1);
                                       	                else
                                        	                j++;
        					}
					}
		                        if(!username && user && user.length)
			                        username = user;
		                        if(!passwd && pass && pass.length)
			                        passwd = pass;

					my.extension.options.servers.push(
					{
						pass: passwd,
						descr: description,
						url: host,
						user: username,
						client: client
					});
		                        success++;
				}
				if(success)
				{
					my.extension.setOptions();
					my.extension.makeMenu();
					my.notify("info",my.t("autoconfiguration_succeeded")+success);
				}
			}
		},

		configHandler: function(details)
		{
			if( !my.extension.configInProgress && 
				(details.type != "xmlhttprequest") && 
				(details.tabId>=0) &&
				my.extension.options.enabled )
			{
				my.extension.configInProgress = true;
				var type = null;
				var user = null;
				var pass = null;				
				for(var i = 0; i < details.responseHeaders.length; i++)
       	        		{
					var header = details.responseHeaders[i];
					switch(header.name.toLowerCase())
					{
						case "content-type":
						{
							type = header.value;
							break;
						}
						case "authorization-echo":
						{
							var loginstr = atob(header.value);
							if(loginstr && loginstr.length && (loginstr.indexOf(":") != -1))
                            				{
								loginstr = loginstr.split(":");
				                                user = loginstr[0];
                                				pass = loginstr[1];
                            				}
							break;
						}
					}
				}
				if((type == "application/seedboxconfig") && user && pass)
				{
					my.ajax(
					{
						url: details.url,
						mimeType: 'text/xml',
						success: function( dummy, xhr )
						{
							var xml = xhr.responseXML;
							if(xml)
								my.extension.parseConfigXML( xml, user, pass );
							else
								my.notify("error","autoconfiguration_failed");
							my.extension.configInProgress = false;
						},
						error: function()
						{
							my.notify("error","autoconfiguration_failed");
							my.extension.configInProgress = false;							
						}
					});
				}
				return( { redirectUrl: 'javascript:void()' } );				
			}
		},

		isSeedboxRelatedURL: function( url )
		{
			var ret = false;
			for(var i = 0; i < my.extension.options.servers.length; i++)
			{
				if(url.indexOf(my.extension.options.servers[i].url)==0)
				{
					ret = true;
					break;
				}
			}
			return(ret);
		},

		torrentHandler: function(details)
		{
			if((details.type != "xmlhttprequest") && 
				(details.tabId>=0) && 
				my.getOption('click') && 
				my.extension.options.servers.length &&
				my.extension.options.enabled &&
				!my.extension.isSeedboxRelatedURL(details.url))
			{
	                	var isTorrent = false;
	                	var tName = details.url.match(/\.torrent$/i);
		                for(var i = 0; !isTorrent && (i < details.responseHeaders.length); i++)
       	        		{
					var header = details.responseHeaders[i];
					switch(header.name.toLowerCase())
					{
						case "content-type":
						{
							isTorrent = isTorrent || (header.value.indexOf("application/x-bittorrent") != -1) || 
								 ((header.value.indexOf("application/octet-stream") != -1) && tName);
							break;
						}
						case "content-disposition":
						{
							isTorrent = isTorrent || header.value.match(/\.torrent$/i);
							break;
						
						}
					}
				}
				if(isTorrent)
				{
					my.extension.retrieveServer(details.tabId, details.url);
					return( { redirectUrl: 'javascript:void()' } );
				}
			}
		},

		onNotificationClick: function(id)
		{
			var notification = my.extension.notifications[id];
			if(notification)
			{
				chrome.notifications.clear(id);
				if(notification.promo)
				{
					my.extension.onPromoClick();
				}
				else
				{
					if(notification.url)
						my.extension.openURL(notification.url);
				}
				delete my.extension.notifications[id];
			}
		},

		setupNotifications: function()
		{
			this.notifications = {};
			chrome.notifications.onClicked.addListener( this.onNotificationClick );
		},

		openOptionsPage: function()
		{
			browser.runtime.openOptionsPage();
		},

		initPrim: function(options)
		{
			my.extension.options = my.merge( my.conf.options_default, options );
			chrome.runtime.onMessage.addListener( my.extension.requestHandler );
			chrome.webRequest.onHeadersReceived.addListener( my.extension.configHandler,
			{
				urls: [ my.conf.confFilter ]
			}, ["responseHeaders", "blocking"]);
			chrome.webRequest.onHeadersReceived.addListener( my.extension.torrentHandler, 
			{
				urls: ["*://*/*"]
			}, ["responseHeaders", "blocking"] );
			my.extension.makeMenu();
			my.extension.setOptions();
			my.extension.setupNotifications();
			my.extension.qBittorrentFilteredURLs = {};
			browser.browserAction.onClicked.addListener(my.extension.openOptionsPage);
			setInterval( my.extension.promoThread, my.conf.promoInterval );
		},

		init: function()
		{
			my.storage.get("options", this.initPrim );
		}
	};

	my.extension.init();	
	return(my);
})(net.xirvik.seedbox || {});