// ==UserScript==
// @id             iitc-plugin-pogo-cells-for-dummies@ijlind
// @name           IITC Plugin: Pogo Cells for Dummies
// @category       Layer
// @version        0.1.0
// @description    Utilities for making pogo submissions easier.
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @grant          none
// ==/UserScript==

// Wrapper function that will be stringified and injected
// into the document. Because of this, normal closure rules
// do not apply here.
function wrapper(plugin_info) {
  // Make sure that window.plugin exists. IITC defines it as a no-op function,
  // and other plugins assume the same.
  if (typeof window.plugin !== 'function') {
    window.plugin = function() {};
  }
  plugin_info.buildName = 'Pogo Cells for Dummies';
  plugin_info.dateTimeVersion = '20190115060000';
  plugin_info.pluginId = 'pogo-dummies';

  /*   ---- START OF PLUGIN ----   */

  // Create a namespace for the plugin
  window.plugin.pogoCells = function() {};

  window.plugin.pogoCells.setup = function() {
    // Will inject S2 utilities to window.S2
    injectS2Calculation();

    // Generic initialisation
    initialiseUI();

    // Bind methods to the namespace
    window.plugin.pogoCells.update = updateFn;

    // Add IITC Plugin Hooks & map event listeners
    window.addHook('mapDataEntityInject', window.plugin.pogoCells.update);
    window.addHook('mapDataRefreshEnd', window.plugin.pogoCells.update);
    map.on('zoomend', window.plugin.pogoCells.update);
    map.on('moveend', window.plugin.pogoCells.update);

    // Kick things off
    window.plugin.pogoCells.update();
  };

  const setup = window.plugin.pogoCells.setup;

  ////// Plugin utility functions

  function drawCellFn(cell, cellBounds, overrides = {}) {
    const corners = cell.getCornerLatLngs();
    const center = cell.getLatLng();
    const color = 'orange';
    // the level 6 cells have noticible errors with non-geodesic lines - and the larger level 4 cells are worse
    // NOTE: we only draw two of the edges. as we draw all cells on screen, the other two edges will either be drawn
    // from the other cell, or be off screen so we don't care
    const borders = L.geodesicPolyline([corners[0], corners[1], corners[2]], {
      fill: false,
      color: overrides.color || color,
      opacity: 0.7,
      weight: overrides.borderWeight || 2,
      clickable: false
    });

    window.plugin.pogoCells.regionLayer.addLayer(borders);
  }

  function initialiseUI() {
    // Add the layer group
    window.plugin.pogoCells.regionLayer = L.layerGroup();
    addLayerGroup('Submit Helper', window.plugin.pogoCells.regionLayer, true);
  }

  function injectS2Calculation() {
    /* prettier-ignore */
    (function(){window.S2={};const a=n=>{const o=Math.PI/180,p=n.lat*o,q=n.lng*o,r=Math.cos(p);return[Math.cos(q)*r,Math.sin(q)*r,Math.sin(p)]},b=n=>{const o=180/Math.PI,p=Math.atan2(n[2],Math.sqrt(n[0]*n[0]+n[1]*n[1])),q=Math.atan2(n[1],n[0]);return L.latLng(p*o,q*o)},c=n=>{const o=[Math.abs(n[0]),Math.abs(n[1]),Math.abs(n[2])];return o[0]>o[1]?o[0]>o[2]?0:2:o[1]>o[2]?1:2},d=(n,o)=>{let p,q;switch(n){case 0:p=o[1]/o[0],q=o[2]/o[0];break;case 1:p=-o[0]/o[1],q=o[2]/o[1];break;case 2:p=-o[0]/o[2],q=-o[1]/o[2];break;case 3:p=o[2]/o[0],q=o[1]/o[0];break;case 4:p=o[2]/o[1],q=-o[0]/o[1];break;case 5:p=-o[1]/o[2],q=-o[0]/o[2];break;default:throw{error:'Invalid face'};}return[p,q]},e=n=>{let o=c(n);return 0>n[o]&&(o+=3),uv=d(o,n),[o,uv]},f=(n,o)=>{const p=o[0],q=o[1];switch(n){case 0:return[1,p,q];case 1:return[-p,1,q];case 2:return[-p,-q,1];case 3:return[-1,-q,-p];case 4:return[q,-1,-p];case 5:return[q,p,-1];default:throw{error:'Invalid face'};}},g=n=>{const o=p=>{return 0.5<=p?1/3*(4*p*p-1):1/3*(1-4*(1-p)*(1-p))};return[o(n[0]),o(n[1])]},h=n=>{const o=p=>{return 0<=p?0.5*Math.sqrt(1+3*p):1-0.5*Math.sqrt(1-3*p)};return[o(n[0]),o(n[1])]},k=(n,o)=>{const p=1<<o,q=r=>{const s=Math.floor(r*p);return Math.max(0,Math.min(p-1,s))};return[q(n[0]),q(n[1])]},l=(n,o,p)=>{const q=1<<o;return[(n[0]+p[0])/q,(n[1]+p[1])/q]},m=(n,o,p)=>{const q={a:[[0,'d'],[1,'a'],[3,'b'],[2,'a']],b:[[2,'b'],[1,'b'],[3,'a'],[0,'c']],c:[[2,'c'],[3,'d'],[1,'c'],[0,'b']],d:[[0,'a'],[3,'c'],[1,'d'],[2,'d']]};let r='a';const s=[];for(let w=p-1;0<=w;w--){const z=1<<w,A=n&z?1:0,B=o&z?1:0,C=q[r][2*A+B];s.push(C[0]),r=C[1]}return s};S2.S2Cell=function(){},S2.S2Cell.FromLatLng=(n,o)=>{const p=a(n),q=e(p),r=h(q[1]),s=k(r,o);return S2.S2Cell.FromFaceIJ(q[0],s,o)},S2.S2Cell.FromFaceIJ=(n,o,p)=>{const q=new S2.S2Cell;return q.face=n,q.ij=o,q.level=p,q},S2.S2Cell.prototype.toString=function(){return'F'+this.face+'ij['+this.ij[0]+','+this.ij[1]+']@'+this.level},S2.S2Cell.prototype.getLatLng=function(){const n=l(this.ij,this.level,[0.5,0.5]),o=g(n),p=f(this.face,o);return b(p)},S2.S2Cell.prototype.getCornerLatLngs=function(){const n=[],o=[[0,0],[0,1],[1,1],[1,0]];for(let p=0;4>p;p++){const q=l(this.ij,this.level,o[p]),r=g(q),s=f(this.face,r);n.push(b(s))}return n},S2.S2Cell.prototype.getFaceAndQuads=function(){const n=m(this.ij[0],this.ij[1],this.level);return[this.face,n]},S2.S2Cell.prototype.getNeighbors=function(){const n=(s,w,z)=>{const A=1<<z;if(0<=w[0]&&0<=w[1]&&w[0]<A&&w[1]<A)return S2.S2Cell.FromFaceIJ(s,w,z);const B=l(w,z,[0.5,0.5]),C=g(B),D=f(s,C),E=e(D);return s=E[0],C=E[1],B=h(C),w=k(B,z),S2.S2Cell.FromFaceIJ(s,w,z)},o=this.face,p=this.ij[0],q=this.ij[1],r=this.level;return[n(o,[p-1,q],r),n(o,[p,q-1],r),n(o,[p+1,q],r),n(o,[p,q+1],r)]}})();
  }

  function pointInPoly(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    let x = point[0],
      y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i][0],
        yi = vs[i][1];
      let xj = vs[j][0],
        yj = vs[j][1];
      let intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function updateFn() {
    window.plugin.pogoCells.regionLayer.clearLayers();

    const bounds = map.getBounds();
    // centre cell
    let zoom = map.getZoom();

    const drawCellAndNeighborsFn = (cell, seenCells, overrides) => {
      const cellStr = cell.toString();

      if (!seenCells[cellStr]) {
        // cell not visited - flag it as visited now
        seenCells[cellStr] = true;
        // is it on the screen?
        const corners = cell.getCornerLatLngs();
        const cellBounds = L.latLngBounds(corners);
        if (cellBounds.intersects(bounds)) {
          // on screen - draw it
          drawCellFn(cell, cellBounds, overrides);
          // and recurse to our neighbors
          const neighbors = cell.getNeighbors();
          for (let i = 0; i < neighbors.length; i++) {
            drawCellAndNeighborsFn(neighbors[i], seenCells, overrides);
          }
        }
      }
    };

    if (zoom > 12) {
      const centerCell = S2.S2Cell.FromLatLng(map.getCenter(), 14);
      drawCellAndNeighborsFn(centerCell, {}, { color: '#ff31d9', borderWeight: 3 });
    }

    if (zoom > 14) {
      const centerCell = S2.S2Cell.FromLatLng(map.getCenter(), 17);
      drawCellAndNeighborsFn(centerCell, {});
    }

    // the six cube side boundaries. we cheat by hard-coding the coords as it's simple enough
    const latLngs = [
      [45, -180],
      [35.264389682754654, -135],
      [35.264389682754654, -45],
      [35.264389682754654, 45],
      [35.264389682754654, 135],
      [45, 180]
    ];
    const globalCellOptions = {
      color: 'red',
      weight: 7,
      opacity: 0.5,
      clickable: false
    };
    for (let i = 0; i < latLngs.length - 1; i++) {
      // the geodesic line code can't handle a line/polyline spanning more than (or close to?) 180 degrees, so we draw
      // each segment as a separate line
      const poly1 = L.geodesicPolyline([latLngs[i], latLngs[i + 1]], globalCellOptions);
      window.plugin.pogoCells.regionLayer.addLayer(poly1);
      //southern mirror of the above
      const poly2 = L.geodesicPolyline(
        [[-latLngs[i][0], latLngs[i][1]], [-latLngs[i + 1][0], latLngs[i + 1][1]]],
        globalCellOptions
      );
      window.plugin.pogoCells.regionLayer.addLayer(poly2);
    }
    // and the north-south lines. no need for geodesic here
    for (let i = -135; i <= 135; i += 90) {
      const poly = L.polyline([[35.264389682754654, i], [-35.264389682754654, i]], globalCellOptions);
      window.plugin.pogoCells.regionLayer.addLayer(poly);
    }
  }

  /*   ---- END OF PLUGIN ----   */

  // Add an info property for IITC's plugin system
  setup.info = plugin_info;
  // Make sure window.bootPlugins exists and is an array
  if (!window.bootPlugins) window.bootPlugins = [];
  // Add our startup hook
  window.bootPlugins.push(setup);
  // If IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup();
}

// Create a script element to hold our content script
var script = document.createElement('script');
var info = {};

// GM_info is defined by the assorted monkey-themed browser extensions
// and holds information parsed from the script header.
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };
}

// Create a text node and our IIFE inside of it
var textContent = document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ')');
// Add some content to the script element
script.appendChild(textContent);
// Finally, inject it... wherever.
(document.body || document.head || document.documentElement).appendChild(script);
