// ==UserScript==
// @id             iitc-plugin-mml-tiles@ijlind
// @name           IITC Plugin: Maanmittauslaitos Map Tiles
// @category       Map Tiles
// @version        0.1.0
// @description    Adds Maanmittauslaitos map tiles to base layers
// @downloadURL    https://github.com/ijlind/iitc-plugins/raw/master/iitc-plugin-mml-tiles.user.js
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
  // ensure plugin framework is there, even if iitc is not yet loaded
  if (typeof window.plugin !== 'function') window.plugin = function() {};

  //PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
  //(leaving them in place might break the 'About IITC' page or break update checks)
  plugin_info.buildName = 'iitc';
  plugin_info.dateTimeVersion = '20171411.21732';
  plugin_info.pluginId = 'basemap-mml';
  //END PLUGIN AUTHORS NOTE

  // PLUGIN START ////////////////////////////////////////////////////////

  // use own namespace for plugin
  window.plugin.mapTileMML = {
    addLayer: function() {
      var opt = {
        attribution: 'Kartta: Maanmittauslaitos',
        maxZoom: 18
      };

      var layers = {
        'http://tiles.kartat.kapsi.fi/peruskartta/{z}/{x}/{y}.jpg': 'MML Peruskartta',
        'http://tiles.kartat.kapsi.fi/taustakartta/{z}/{x}/{y}.jpg': 'MML Taustakartta',
        'http://tiles.kartat.kapsi.fi/ortokuva/{z}/{x}/{y}.jpg': 'MML Ortoilmakuva'
      };

      for (var url in layers) {
        var layer = new L.TileLayer(url, opt);
        layerChooser.addBaseLayer(layer, layers[url]);
      }
    }
  };

  var setup = window.plugin.mapTileMML.addLayer;

  // PLUGIN END //////////////////////////////////////////////////////////

  setup.info = plugin_info; //add the script info data to the function as a property
  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  // if IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script)
  info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
