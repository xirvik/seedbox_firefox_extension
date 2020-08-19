if(typeof(net) == "undefined") var net = {};
if(!net.xirvik) net.xirvik = {};
net.xirvik.seedbox = (function(my) 
{
	my.merge = function(target, source) 
	{
		if( typeof target !== 'object' ) 
		{
			target = {};
    		}
		if( typeof source !== 'object' ) 
		{
			source = {};
    		}
		for(var property in source) 
		{
		        if( source.hasOwnProperty(property) ) 
		        {
				target[ property ] = source[ property ];
        		}
		}
		return(target);
	};

	my.getOption = function( opt )
	{
		return( my.extension && my.extension.options ? my.extension.options[opt] : my.conf.options_default[opt] );
	};

	my.storage = 
	{
		get : function(key, callback) 
		{
			chrome.storage.sync.get(key, function(items)
			{
				var ret = null;
				if(chrome.runtime.lastError || !items || !items[key])
				{
					try { ret = JSON.parse(localStorage.getItem(key)); } catch(e) {}		
				}
				else
				{
					ret = items[key];
				}
				callback(ret);
			});
	    	},
    	
		put : function(key, value, callback) 
		{
			var obj = {};
			obj[key] = value;
			chrome.storage.sync.set( obj, callback );
		}
	};

	my.log = function()
	{
		if(my.getOption('console'))
		{
			for(var i = 0; i < arguments.length; i++)
			{
				console.log("[Xirvik] ",arguments[i]);
			}
		}
	};

	my.notify = function(theme, text, url)
	{
		theme = my.t(theme) || theme;
		text = my.t(text) || text;
		my.log( theme+": "+text );
		if(my.extension.showNotification)
			my.extension.showNotification(theme,text,url)
		else
			chrome.runtime.sendMessage( { type: 'notification', 'theme': theme, 'text': text, 'url': url } );
	};

	my.addslash = function(s)
	{
		return((s.length && s[s.length-1]!='/') ? s+'/' : s);
	};

	my.fullpath = function(s)
	{
		var arr = s.split('/');
		var ret = [];
		for( var i=0; i<arr.length; i++ )
		{
			if(arr[i]=='' || arr[i]=='.') continue;
			if(arr[i]=='..')
				ret.pop();
			else
				ret.push(arr[i]);
		}
		return(ret.join('/'));
	};

	my.normalize = function(dir)
	{
		return(my.addslash(my.fullpath(dir)));
	};

	my.basepath = function(s)
	{
		var arr = s.split('/');
		var ret = [];
		for( var i=0; i<arr.length-1; i++ )
		{
			if(arr[i]=='.') continue;
			if(arr[i]=='..')
				ret.pop();
			else
				ret.push(arr[i]);
		}
		return(my.addslash(ret.join('/')));
	};

	my.ajax = function( options )
	{
		var xhr = new XMLHttpRequest();
		options.method = options.method || 'GET';
		if(options.method=='GET')
		{
			var sep = options.url.indexOf('?') === -1 ? '?' : '&';
        		options.url = options.url + sep + '_=' + new Date().getTime();
		}
		xhr.open(options.method, options.url, true, options.user, options.pass);
		xhr.withCredentials = true;
		xhr.setRequestHeader( "Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate, proxy-revalidate" );
		xhr.mozBackgroundRequest = true;
		xhr.timeout = my.getOption('timeout')*1000;
		for( var hdr in (options.headers || {}) )
			xhr.setRequestHeader( hdr, options.headers[hdr] );
		if(options.mimeType)
			xhr.overrideMimeType(options.mimeType);
		if(options.responseType)
			xhr.responseType = options.responseType;
		if(options.ifModifiedSince)
			xhr.setRequestHeader("If-Modified-Since", options.ifModifiedSince);

		xhr.onreadystatechange = function(res)
		{
			if(xhr.readyState == 4)
			{
				switch(xhr.status)
       	    			{
					case 200:
					{
						if(options.success)
						{
							var ret = null;
							try{ ret = JSON.parse(xhr.response); } catch(e) {};
							options.success(ret,xhr,options.base);
						}
						break;
                    			}
					default:
					{
						if(options.error)
							options.error(xhr.status,options.base);
						break;
					}
				}
			}
		};

		if(options.error)
		{
			xhr.ontimeout = function()
			{
				options.error(-1,options.base);
			};
		}

		xhr.send( options.data );
	};

	my.getHost = function( url )
	{
		var arr = url.match(new RegExp('^http(?:s)?\://([^/:]+)', 'im'));
		return( (arr && (arr.length>1)) ? arr[1].toString().toLowerCase() : '' );
	};
	
	my.getOrigin = function( url )
	{
		var arr = url.match(new RegExp('^http(?:s)?\://([^/:]+)', 'im'));
		return( (arr && (arr.length>0)) ? arr[0].toString().toLowerCase() : '' );
	};

	my.standardSuccessHandling = function( dummy, req, url )
	{
		var msg = null;
		var text = req.responseText;
		try 
		{
			var json = JSON.parse(text);
			if("error" in json)
			{
				msg = json["error"];
				if( (typeof(msg)=="object") && msg["message"] )
					msg = msg["message"];
			}
		} catch(e)
		{
			if(/^noty\(.*\+theUILang\.addTorrent.*,"error"\);/.test(text))
				msg = my.t("torrent_upload_fail");
			else
				if(msg = text.match(/<strong>Error(.*)<\/strong>/))
					msg = "Error"+msg[1];
		}
		if(msg===null)
		{
			if(my.getOption("messageuc"))
				my.notify("info",'torrent_uploaded', url);
		}					
		else
			if(my.getOption("messageuf"))
				my.standardErrorHandling(-2, url, msg);
	};

	my.standardErrorHandling = function( status, url, text )
	{
		var msg = my.t('request_failed');
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
			case -2:
			{
				msg += (text ? text : my.t("torrent_upload_fail"));
				break;							
			}			
			default:
			{
				msg += (text ? text : my.t('servers_response')) + ' (status: '+status+')';
				break;
			}
		}	
		my.notify('error',msg,url);
	};

	my.t = function( data )
	{
		return( chrome.i18n.getMessage(data) );
	};
	
	my.i18n = function()
	{
		$('[data-i18n]').each(function() 
		{
			var text = my.t($(this).data('i18n'));
			if(text.indexOf('html:')==0)
				$(this).html( text.substr(5) );
			else
				$(this).text( my.t($(this).data('i18n')) );
		});
		$('[data-i18n-title]').each(function() 
		{
			$(this).attr( 'title', my.t($(this).data('i18n-title')) );
		});		
	};

	my.trim = function(str)
	{
		return(str.replace(/^\s+|\s+$/g, ''));
	};	

	my.isXivikConfiguration = function( servers )
	{
		var ret = true;
		for( var i in servers )
		{
			var server = servers[i];
			if( my.getHost(server.url).indexOf( my.conf.xirvikDomain )<0 )
			{
				ret = false;
				break;
			}
		}
		return(ret);
	};

	my.bencode = function( blob, success, error )
	{
		var i = 0;
		var text = '';
		var parser = function()
		{
			var c = text.charAt(i);
		        switch (c) 
		        {
				case 'i':
				{
			                var matches = text.slice(i).match(/^i(-?\d+)e/);
					if( !matches )
						break;
					i += matches[0].length;
					return Number(matches[1]);
				}					
				case 'l':
				{
					i++;
					var result = [];
					while ( i < text.length && text.charAt(i) != 'e' )
						result.push(parser());
					if( text.charAt(i) != 'e' )
						break;
					i++;
					return result;
				}					
				case 'd':
				{
					i++;
					var result = {};
					while ( i < text.length && text.charAt(i) != 'e' ) 
					{
						var k = parser();
						if(k=='info')
							return result;
						var v = parser();
						result[k] = v;
					}
					if ( text.charAt(i) != 'e' )
						break;
					i++;
					return result;
				}
				default:
				{
					var matches = text.slice(i).match(/^(\d+):/);
					if( !matches )
						break;
					var len = Number(matches[1]);
					var a = i + matches[0].length;
					var b = a + len;
					var result = '';
					if( len < 1024 )	// don't process large fields
					{
						result = text.slice(a, b);
						if( result.length != len )
							break;
					}							
					i = b;
					return result;
				}
			}				
			throw new RangeError('Bencode.parse: Illegal at ' + i + ' (0x' + i.toString(16).toUpperCase() + ')');
		};

		var reader = new FileReader();
		reader.onload = function () 
		{
			try 
			{
				text = reader.result;
				var ret = parser();
				var result = {};
				if( ret['announce'] )
					result['{TRACKER}'] = my.getHost(ret['announce']);
				else
				if( ret['announce-list'] && ret['announce-list'].length  && ret['announce-list'][0].length)
					result['{TRACKER}'] = my.getHost(ret['announce-list'][0][0]);
				if( ret['creation date'] )
					result['{CREATION}'] = (new Date(ret['creation date'] * 1000)).toISOString().substr(0,10);
				success(result);
			} catch(e)
			{
				console.log(e);
				error(e);
			}
		}			
		reader.readAsBinaryString(blob);
	};

	return(my);
})(net.xirvik.seedbox || {});