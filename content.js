if(typeof(net) == "undefined") var net = {};
if(!net.xirvik) net.xirvik = {};
net.xirvik.seedbox = (function(my) 
{
	my.extension = 
	{
		options: my.conf.default_options,

		init: function()
		{
			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
			{
				if(request.type=="optionschanged")
					my.extension.options = request.options;	
			});
		},

		load: function( callback )
		{
			chrome.runtime.sendMessage( { type: 'getoptions' }, function(response)
			{
				my.extension.options = response;
				my.log("Options was retrieved.");
				if(callback)
					callback( my.extension.options );
			});
		},

		store: function( callback )
		{
			chrome.runtime.sendMessage( { type: 'setoptions', options: this.options  }, callback );
		},

		showNotification: function( theme, text, url, isPromo )
		{
			chrome.runtime.sendMessage( { type: 'notification', theme: theme, text: text, url: url } );
		}
	};

	my.extension.init();
			
	return(my);
})(net.xirvik.seedbox || {});		