// ==UserScript==
// @id             iitc-plugin-submit-helper@ijlind
// @name           IITC Plugin: Submit Helper
// @category       Layer
// @version        0.1.0
// @description    Utilities for making portal submissions easier.
// @updateURL      https://github.com/ijlind/iitc-plugins/raw/master/iitc-plugin-submit-tools.user.js
// @downloadURL    https://github.com/ijlind/iitc-plugins/raw/master/iitc-plugin-submit-tools.user.js
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
  // ensure plugin framework is there, even if iitc is not yet loaded
  if (typeof window.plugin !== 'function') window.plugin = function() {}

  // PLUGIN START ////////////////////////////////////////////////////////

  const helpers = {
    zoomLocked: 0,
    showGymCells: 0,
    showCellsWithPortals: 0,
  }

  const logger = {
    info: (...args) => console.log('S2ZOOM', ...args),
  }

  // Use own namespace for plugin
  window.plugin.l10s2grid = function() {}

  const toggleHelper = (key, targetValue) => {
    if (helpers[key]) {
      $(`#iitc-plugin-${key}`).removeClass('active')
      helpers[key] = 0
    } else {
      $(`#iitc-plugin-${key}`).addClass('active')
      helpers[key] = targetValue
    }

    window.plugin.l10s2grid.update()
  }

  window.plugin.l10s2grid.toggleShowCellsWithPortals = () => {
    toggleHelper('showCellsWithPortals', true)
  }
  window.plugin.l10s2grid.toggleShowGymCells = () => {
    toggleHelper('showGymCells', true)
  }
  window.plugin.l10s2grid.toggleZoomLocked = () => {
    toggleHelper('zoomLocked', map.getZoom())
  }

  window.plugin.l10s2grid.setup = function() {
    $('<link>')
      .prop('rel', 'stylesheet')
      .prop('href', 'https://use.fontawesome.com/releases/v5.4.2/css/all.css')
      .appendTo('head')

    /// S2 Geometry functions
    // the regional scoreboard is based on a level 6 S2 Cell
    // - https://docs.google.com/presentation/d/1Hl4KapfAENAOf4gv-pSngKwvS_jwNVHRPZTTDzXXn6Q/view?pli=1#slide=id.i22
    // at the time of writing there's no actual API for the intel map to retrieve scoreboard data,
    // but it's still useful to plot the score cells on the intel map

    // the S2 geometry is based on projecting the earth sphere onto a cube, with some scaling of face coordinates to
    // keep things close to approximate equal area for adjacent cells
    // to convert a lat,lng into a cell id:
    // - convert lat,lng to x,y,z
    // - convert x,y,z into face,u,v
    // - u,v scaled to s,t with quadratic formula
    // - s,t converted to integer i,j offsets
    // - i,j converted to a position along a Hubbert space-filling curve
    // - combine face,position to get the cell id

    //NOTE: compared to the google S2 geometry library, we vary from their code in the following ways
    // - cell IDs: they combine face and the hilbert curve position into a single 64 bit number. this gives efficient space
    //             and speed. javascript doesn't have appropriate data types, and speed is not cricical, so we use
    //             as [face,[bitpair,bitpair,...]] instead
    // - i,j: they always use 30 bits, adjusting as needed. we use 0 to (1<<level)-1 instead
    //        (so GetSizeIJ for a cell is always 1)
    ;(function() {
      window.S2 = {}

      const submitToolStyles = `
    #iitc-plugin-showCellsWithPortals,
    #iitc-plugin-showGymCells,
    #iitc-plugin-zoomLocked {
      height: 26px;
      width: 26px;
      right:0;
      z-index:3003;
      background: #fff;
      color: black;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      cursor: pointer;
      position: relative;
      border-bottom: 1px solid #ccc;
    }
    #iitc-plugin-zoomLocked.active {
      background: #c75c3b;
      color: whitesmoke;
    }
    #iitc-plugin-showGymCells {
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
      border-bottom: 0;
    }
    #iitc-plugin-showCellsWithPortals > i,
    #iitc-plugin-showGymCells > i {
      font-size: 18px;
      padding-left: 2px;
      opacity: 0.3;
    }
    #iitc-plugin-showCellsWithPortals.active > i,
    #iitc-plugin-showGymCells.active > i {
      opacity: 1
    }
    .leaflet-touch #iitc-plugin-showCellsWithPortals,
    .leaflet-touch #iitc-plugin-showGymCells,
    .leaflet-touch #iitc-plugin-zoomLocked {
      height: 30px;
      width: 30px;
    }
  `
      $('.leaflet-control-zoom').append(
        '<div title="S2 LVL Locker" id="iitc-plugin-zoomLocked">z</div>',
      )
      $('.leaflet-control-zoom').append(
        '<div title="S2 Empty Indicator" id="iitc-plugin-showCellsWithPortals"><i class="fas fa-eye"></i></div>',
      )
      $('.leaflet-control-zoom').append(
        '<div title="S2 Gym Cell Indicator" id="iitc-plugin-showGymCells"><i class="fas fa-dragon"></i></div>',
      )
      $('<style>')
        .prop('type', 'text/css')
        .html(submitToolStyles)
        .appendTo('head')
      $('#iitc-plugin-showGymCells').click(
        window.plugin.l10s2grid.toggleShowGymCells,
      )
      $('#iitc-plugin-showCellsWithPortals').click(
        window.plugin.l10s2grid.toggleShowCellsWithPortals,
      )
      $('#iitc-plugin-zoomLocked').click(
        window.plugin.l10s2grid.toggleZoomLocked,
      )

      const setZoomText = () => {
        $('#iitc-plugin-zoomLocked').text(
          `z${helpers.zoomLocked || map.getZoom()}`,
        )
      }
      window.addHook('mapDataEntityInject', setZoomText)
      window.addHook('mapDataRefreshEnd', () => {
        setZoomText()
        window.plugin.l10s2grid.update()
      })
      const LatLngToXYZ = (latLng) => {
        const d2r = Math.PI / 180.0
        const phi = latLng.lat * d2r
        const theta = latLng.lng * d2r
        const cosphi = Math.cos(phi)

        return [
          Math.cos(theta) * cosphi,
          Math.sin(theta) * cosphi,
          Math.sin(phi),
        ]
      }
      const XYZToLatLng = (xyz) => {
        const r2d = 180.0 / Math.PI
        const lat = Math.atan2(
          xyz[2],
          Math.sqrt(xyz[0] * xyz[0] + xyz[1] * xyz[1]),
        )
        const lng = Math.atan2(xyz[1], xyz[0])

        return L.latLng(lat * r2d, lng * r2d)
      }
      const largestAbsComponent = (xyz) => {
        const temp = [Math.abs(xyz[0]), Math.abs(xyz[1]), Math.abs(xyz[2])]

        if (temp[0] > temp[1]) {
          if (temp[0] > temp[2]) {
            return 0
          } else {
            return 2
          }
        } else {
          if (temp[1] > temp[2]) {
            return 1
          } else {
            return 2
          }
        }
      }
      const faceXYZToUV = (face, xyz) => {
        let u, v
        switch (face) {
          case 0:
            u = xyz[1] / xyz[0]
            v = xyz[2] / xyz[0]
            break
          case 1:
            u = -xyz[0] / xyz[1]
            v = xyz[2] / xyz[1]
            break
          case 2:
            u = -xyz[0] / xyz[2]
            v = -xyz[1] / xyz[2]
            break
          case 3:
            u = xyz[2] / xyz[0]
            v = xyz[1] / xyz[0]
            break
          case 4:
            u = xyz[2] / xyz[1]
            v = -xyz[0] / xyz[1]
            break
          case 5:
            u = -xyz[1] / xyz[2]
            v = -xyz[0] / xyz[2]
            break
          default:
            throw { error: 'Invalid face' }
            break
        }
        return [u, v]
      }
      const XYZToFaceUV = (xyz) => {
        let face = largestAbsComponent(xyz)
        if (xyz[face] < 0) {
          face += 3
        }
        uv = faceXYZToUV(face, xyz)
        return [face, uv]
      }
      const FaceUVToXYZ = (face, uv) => {
        const u = uv[0]
        const v = uv[1]
        switch (face) {
          case 0:
            return [1, u, v]
          case 1:
            return [-u, 1, v]
          case 2:
            return [-u, -v, 1]
          case 3:
            return [-1, -v, -u]
          case 4:
            return [v, -1, -u]
          case 5:
            return [v, u, -1]
          default:
            throw { error: 'Invalid face' }
        }
      }
      const STToUV = (st) => {
        const singleSTtoUV = (st) => {
          if (st >= 0.5) {
            return (1 / 3.0) * (4 * st * st - 1)
          } else {
            return (1 / 3.0) * (1 - 4 * (1 - st) * (1 - st))
          }
        }
        return [singleSTtoUV(st[0]), singleSTtoUV(st[1])]
      }
      const UVToST = (uv) => {
        const singleUVtoST = (uv) => {
          if (uv >= 0) {
            return 0.5 * Math.sqrt(1 + 3 * uv)
          } else {
            return 1 - 0.5 * Math.sqrt(1 - 3 * uv)
          }
        }
        return [singleUVtoST(uv[0]), singleUVtoST(uv[1])]
      }
      const STToIJ = (st, order) => {
        const maxSize = 1 << order
        const singleSTtoIJ = (st) => {
          const ij = Math.floor(st * maxSize)
          return Math.max(0, Math.min(maxSize - 1, ij))
        }
        return [singleSTtoIJ(st[0]), singleSTtoIJ(st[1])]
      }
      const IJToST = (ij, order, offsets) => {
        const maxSize = 1 << order
        return [(ij[0] + offsets[0]) / maxSize, (ij[1] + offsets[1]) / maxSize]
      }
      // hilbert space-filling curve
      // based on http://blog.notdot.net/2009/11/Damn-Cool-Algorithms-Spatial-indexing-with-Quadtrees-and-Hilbert-Curves
      // note: rather then calculating the final integer hilbert position, we just return the list of quads
      // this ensures no precision issues whth large orders (S3 cell IDs use up to 30), and is more
      // convenient for pulling out the individual bits as needed later
      const pointToHilbertQuadList = (x, y, order) => {
        const hilbertMap = {
          a: [[0, 'd'], [1, 'a'], [3, 'b'], [2, 'a']],
          b: [[2, 'b'], [1, 'b'], [3, 'a'], [0, 'c']],
          c: [[2, 'c'], [3, 'd'], [1, 'c'], [0, 'b']],
          d: [[0, 'a'], [3, 'c'], [1, 'd'], [2, 'd']],
        }
        let currentSquare = 'a'
        const positions = []
        for (let i = order - 1; i >= 0; i--) {
          const mask = 1 << i
          const quad_x = x & mask ? 1 : 0
          const quad_y = y & mask ? 1 : 0
          const t = hilbertMap[currentSquare][quad_x * 2 + quad_y]

          positions.push(t[0])
          currentSquare = t[1]
        }
        return positions
      }
      // S2Cell class
      S2.S2Cell = function() {}
      //static method to construct
      S2.S2Cell.FromLatLng = (latLng, level) => {
        const xyz = LatLngToXYZ(latLng)
        const faceuv = XYZToFaceUV(xyz)
        const st = UVToST(faceuv[1])
        const ij = STToIJ(st, level)

        return S2.S2Cell.FromFaceIJ(faceuv[0], ij, level)
        return result
      }
      S2.S2Cell.FromFaceIJ = (face, ij, level) => {
        const cell = new S2.S2Cell()

        cell.face = face
        cell.ij = ij
        cell.level = level

        return cell
      }
      S2.S2Cell.prototype.toString = function() {
        return (
          'F' +
          this.face +
          'ij[' +
          this.ij[0] +
          ',' +
          this.ij[1] +
          ']@' +
          this.level
        )
      }
      S2.S2Cell.prototype.getLatLng = function() {
        const st = IJToST(this.ij, this.level, [0.5, 0.5])
        const uv = STToUV(st)
        const xyz = FaceUVToXYZ(this.face, uv)

        return XYZToLatLng(xyz)
      }
      S2.S2Cell.prototype.getCornerLatLngs = function() {
        const result = []
        const offsets = [[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0]]

        for (let i = 0; i < 4; i++) {
          const st = IJToST(this.ij, this.level, offsets[i])
          const uv = STToUV(st)
          const xyz = FaceUVToXYZ(this.face, uv)

          result.push(XYZToLatLng(xyz))
        }
        return result
      }
      S2.S2Cell.prototype.getFaceAndQuads = function() {
        const quads = pointToHilbertQuadList(this.ij[0], this.ij[1], this.level)
        return [this.face, quads]
      }
      S2.S2Cell.prototype.getNeighbors = function() {
        const fromFaceIJWrap = (face, ij, level) => {
          const maxSize = 1 << level
          if (ij[0] >= 0 && ij[1] >= 0 && ij[0] < maxSize && ij[1] < maxSize) {
            // no wrapping out of bounds
            return S2.S2Cell.FromFaceIJ(face, ij, level)
          } else {
            // the new i,j are out of range.
            // with the assumption that they're only a little past the borders we can just take the points as
            // just beyond the cube face, project to XYZ, then re-create FaceUV from the XYZ vector
            const st = IJToST(ij, level, [0.5, 0.5])
            const uv = STToUV(st)
            const xyz = FaceUVToXYZ(face, uv)
            const faceuv = XYZToFaceUV(xyz)

            face = faceuv[0]
            uv = faceuv[1]
            st = UVToST(uv)
            ij = STToIJ(st, level)

            return S2.S2Cell.FromFaceIJ(face, ij, level)
          }
        }
        const face = this.face
        const i = this.ij[0]
        const j = this.ij[1]
        const level = this.level

        return [
          fromFaceIJWrap(face, [i - 1, j], level),
          fromFaceIJWrap(face, [i, j - 1], level),
          fromFaceIJWrap(face, [i + 1, j], level),
          fromFaceIJWrap(face, [i, j + 1], level),
        ]
      }
    })()
    window.plugin.l10s2grid.regionLayer = L.layerGroup()

    $('<style>')
      .prop('type', 'text/css')
      .html(
        '.plugin-l10s2grid-name {\
               font-size: 14px;\
               font-weight: bold;\
               color: gold;\
               opacity: 0.7;\
               text-align: center;\
               text-shadow: -1px -1px #000, 1px -1px #000, -1px 1px #000, 1px 1px #000, 0 0 2px #000; \
               pointer-events: none;\
            }',
      )
      .appendTo('head')
    addLayerGroup('S2 Grid', window.plugin.l10s2grid.regionLayer, true)
    map.on('moveend', window.plugin.l10s2grid.update)
    window.plugin.l10s2grid.update()
  }
  window.plugin.l10s2grid.regionName = (cell) => {
    const face2name = ['AF', 'AS', 'NR', 'PA', 'AM', 'ST']
    const codeWord = [
      'ALPHA',
      'BRAVO',
      'CHARLIE',
      'DELTA',
      'ECHO',
      'FOXTROT',
      'GOLF',
      'HOTEL',
      'JULIET',
      'KILO',
      'LIMA',
      'MIKE',
      'NOVEMBER',
      'PAPA',
      'ROMEO',
      'SIERRA',
    ]
    // ingress does some odd things with the naming. for some faces, the i and j coords are flipped when converting
    // (and not only the names - but the full quad coords too!). easiest fix is to create a temporary cell with the coords
    // swapped
    if (cell.face == 1 || cell.face == 3 || cell.face == 5) {
      cell = S2.S2Cell.FromFaceIJ(
        cell.face,
        [cell.ij[1], cell.ij[0]],
        cell.level,
      )
    }
    // first component of the name is the face
    let name = face2name[cell.face]
    if (cell.level >= 4) {
      // next two components are from the most signifitant four bits of the cell I/J
      const regionI = cell.ij[0] >> (cell.level - 4)
      const regionJ = cell.ij[1] >> (cell.level - 4)
      name += zeroPad(regionI + 1, 2) + '-' + codeWord[regionJ]
    }
    if (cell.level >= 8) {
      // the final component is based on the hibbert curve for the relevant cell
      const facequads = cell.getFaceAndQuads()
      const number = facequads[1][4] * 4 + facequads[1][5]
      name += '-' + zeroPad(number, 2)
    }
    return name
  }
  window.plugin.l10s2grid.update = () => {
    window.plugin.l10s2grid.regionLayer.clearLayers()
    const bounds = map.getBounds()
    const seenCells = {}
    const drawCellAndNeighbors = (
      cell,
      visiblePortals = [],
      colourOverride,
    ) => {
      const cellStr = cell.toString()
      if (!seenCells[cellStr]) {
        // cell not visited - flag it as visited now
        seenCells[cellStr] = true
        // is it on the screen?
        const corners = cell.getCornerLatLngs()
        const cellBounds = L.latLngBounds(corners)
        if (cellBounds.intersects(bounds)) {
          // on screen - draw it
          window.plugin.l10s2grid.drawCell(
            cell,
            cellBounds,
            visiblePortals,
            colourOverride,
          )
          // and recurse to our neighbors
          const neighbors = cell.getNeighbors()
          for (let i = 0; i < neighbors.length; i++) {
            drawCellAndNeighbors(neighbors[i], visiblePortals, colourOverride)
          }
        }
      }
    }
    // Set Cell Size
    let cellSize = 10
    // centre cell
    let zoom = map.getZoom()
    if (helpers.zoomLocked === 0) {
      cellSize = zoom
    } else {
      cellSize = helpers.zoomLocked
    }
    if (zoom >= 5) {
      const mapBounds = map.getBounds()
      const visiblePortals = Object.values(window.portals || {})
        .map((x) => ({
          latLng: x.getLatLng(),
          title: x.options.data.title,
        }))
        .filter((x) => x)
        .filter((x) => {
          if (!x.title || !x.latLng) return false
          return mapBounds.contains(x.latLng)
        })

      const cell = S2.S2Cell.FromLatLng(map.getCenter(), cellSize)
      drawCellAndNeighbors(cell, visiblePortals)
    }

    if (helpers.showGymCells) {
      const center = S2.S2Cell.FromLatLng(map.getCenter(), 14)
      drawCellAndNeighbors(center, [], '#ff31d9')
    }
    // the six cube side boundaries. we cheat by hard-coding the coords as it's simple enough
    const latLngs = [
      [45, -180],
      [35.264389682754654, -135],
      [35.264389682754654, -45],
      [35.264389682754654, 45],
      [35.264389682754654, 135],
      [45, 180],
    ]
    const globalCellOptions = {
      color: 'red',
      weight: 7,
      opacity: 0.5,
      clickable: false,
    }
    for (let i = 0; i < latLngs.length - 1; i++) {
      // the geodesic line code can't handle a line/polyline spanning more than (or close to?) 180 degrees, so we draw
      // each segment as a separate line
      const poly1 = L.geodesicPolyline(
        [latLngs[i], latLngs[i + 1]],
        globalCellOptions,
      )
      window.plugin.l10s2grid.regionLayer.addLayer(poly1)
      //southern mirror of the above
      const poly2 = L.geodesicPolyline(
        [
          [-latLngs[i][0], latLngs[i][1]],
          [-latLngs[i + 1][0], latLngs[i + 1][1]],
        ],
        globalCellOptions,
      )
      window.plugin.l10s2grid.regionLayer.addLayer(poly2)
    }
    // and the north-south lines. no need for geodesic here
    for (let i = -135; i <= 135; i += 90) {
      const poly = L.polyline(
        [[35.264389682754654, i], [-35.264389682754654, i]],
        globalCellOptions,
      )
      window.plugin.l10s2grid.regionLayer.addLayer(poly)
    }
  }
  window.plugin.l10s2grid.drawCell = (
    cell,
    cellBounds,
    visiblePortals,
    colourOverride,
  ) => {
    //TODO: move to function - then call for all cells on screen
    // corner points
    const corners = cell.getCornerLatLngs()
    // center point
    const center = cell.getLatLng()
    // name
    const name = window.plugin.l10s2grid.regionName(cell)
    const color = cell.level == 10 ? 'gold' : 'orange'
    // the level 6 cells have noticible errors with non-geodesic lines - and the larger level 4 cells are worse
    // NOTE: we only draw two of the edges. as we draw all cells on screen, the other two edges will either be drawn
    // from the other cell, or be off screen so we don't care
    const borders = L.geodesicPolyline([corners[0], corners[1], corners[2]], {
      fill: false,
      color: colourOverride || color,
      opacity: 0.5,
      weight: 2,
      clickable: false,
    })

    const pointInPoly = (point, vs) => {
      // ray-casting algorithm based on
      // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
      let x = point[0],
        y = point[1]
      let inside = false
      for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0],
          yi = vs[i][1]
        let xj = vs[j][0],
          yj = vs[j][1]
        let intersect =
          yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
        if (intersect) inside = !inside
      }
      return inside
    }

    window.plugin.l10s2grid.regionLayer.addLayer(borders)
    // Show indicator of non-empty cells (only on level 15 and smaller).
    // This cannot reasonably be used on zoom levels higher than that (e.g. for
    // searching gyms) because the intel map only returns links on higher zoom
    // levels.
    if (cell.level >= 15 && helpers.showCellsWithPortals) {
      const cellPortals = visiblePortals.filter((x) => {
        const point = [x.latLng.lat, x.latLng.lng]
        const poly = corners.map((x) => [x.lat, x.lng])

        return pointInPoly(point, poly)
      })

      if (cellPortals.length) {
        const fill = L.geodesicPolyline(corners, {
          fill: true,
          color: 'red',
          fillOpacity: 0.6,
          weight: 0,
          clickable: false,
        })
        window.plugin.l10s2grid.regionLayer.addLayer(fill)
      }
    }
  }
  const setup = window.plugin.l10s2grid.setup
  // PLUGIN END //////////////////////////////////////////////////////////
  setup.info = plugin_info //add the script info data to the function as a property
  if (!window.bootPlugins) window.bootPlugins = []
  window.bootPlugins.push(setup)
  // if IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup()
} // wrapper end
// inject code into site context
const script = document.createElement('script')
const info = {}
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script)
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description,
  }
script.appendChild(
  document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'),
)
;(document.body || document.head || document.documentElement).appendChild(
  script,
)
