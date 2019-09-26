if(typeof(net) == "undefined") var net = {};
if(!net.xirvik) net.xirvik = {};
net.xirvik.seedbox = (function(my) 
{
	my.conf = 
	{
		options_default:
		{
			servers:   [],
			click:     true, 	/* Capture torrent clicks */
			capture:   0,           /* Capture mode */
                	messageds: false,       /* Download start + */
			messagedf: true,        /* Download failure */
			messageus: false,       /* Upload start + */
			messageuc: true,        /* Upload success + */
			messageuf: true,        /* Upload failure */
			messagesf: true,        /* Server login failure */
			messagest: true,        /* Server connection timeout */
			nostart:   false,       /* Upload without starting the torrent automatically */
			timeout:   15,          /* Timeout value, in seconds, for server connections */
			console:   true,        /* Show console output */
			enabled:   true	 	/* is extension enabled */
		},
		notificationDelay: 5000,
		confFilter: "*://*.xirvik.com/browsers_addons/get_addon_config.php",
		xirvikDomain: '.xirvik.com'
	};
            
	return(my);
})(net.xirvik.seedbox || {});
