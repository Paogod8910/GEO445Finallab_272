/* ============================================================
   Bangkok Urban Well-Being WebGIS — script.js
   ============================================================ */

/* ---- 1. Initialize Map ---- */
var map = L.map('map', {
  zoomControl: true,
  attributionControl: true
}).setView([13.7563, 100.5018], 12);


/* ---- 2. Basemap Tile Layers ---- */
var basemaps = {
  streets: L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenStreetMap contributors', maxZoom: 19 }
  ),
  satellite: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: '© Esri, Maxar', maxZoom: 19 }
  ),
  dark: L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    { attribution: '© Stadia Maps, © OpenMapTiles, © OpenStreetMap', maxZoom: 20 }
  )
};
basemaps.streets.addTo(map);


/* ---- 3. Landuse Color Config ---- */
// LUL1_CODE -> style config
// ประเภท: U=ตัวเมือง, A=เกษตร, F=ป่าชายเลน, W=แหล่งน้ำ, M=ทุ่งหญ้า
var landuseConfig = {
  'U': { color: '#f97316', label: 'ตัวเมืองและย่านการค้า',    icon: 'fa-building'  },
  'A': { color: '#22c55e', label: 'เกษตรกรรม',                icon: 'fa-seedling'  },
  'F': { color: '#15803d', label: 'ป่าชายเลน',                 icon: 'fa-tree'      },
  'W': { color: '#38bdf8', label: 'แหล่งน้ำ',                  icon: 'fa-water'     },
  'M': { color: '#a3e635', label: 'ทุ่งหญ้าธรรมชาติ',          icon: 'fa-leaf'      }
};

function getLanduseStyle(code) {
  var cfg = landuseConfig[code] || { color: '#94a3b8' };
  return {
    color:       cfg.color,
    weight:      1,
    fillColor:   cfg.color,
    fillOpacity: 0.28
  };
}


/* ---- 4. GeoJSON Layer Definitions ---- */

// --- MRT Line ---
var mrtLayer = L.geoJSON(null, {
  style: { color: '#00c8ff', weight: 3.5, opacity: 0.9 },
  onEachFeature: function(feature, layer) {
    var props = feature.properties;
    var name  = props.name || props.NAME || props.route || 'สายรถไฟฟ้า';
    layer.bindPopup(buildPopup('mrt', name, props));
    layer.on('click',     function() { showFeatureInfo('mrt', name, props); });
    layer.on('mouseover', function() { this.setStyle({ weight: 5, color: '#7ee8ff' }); });
    layer.on('mouseout',  function() { mrtLayer.resetStyle(this); });
  }
});

// --- Restaurants ---
var resLayer = L.geoJSON(null, {
  pointToLayer: function(feature, latlng) {
    return L.circleMarker(latlng, {
      radius: 6, fillColor: '#ff9f43', color: '#fff',
      weight: 1.5, opacity: 1, fillOpacity: 0.85
    });
  },
  onEachFeature: function(feature, layer) {
    var props = feature.properties;
    var name  = props.name || props.NAME || 'ร้านอาหาร';
    layer.bindPopup(buildPopup('res', name, props));
    layer.on('click',     function() { showFeatureInfo('res', name, props); });
    layer.on('mouseover', function() { this.setStyle({ radius: 9, fillColor: '#ffcc7a' }); });
    layer.on('mouseout',  function() { resLayer.resetStyle(this); });
  }
});

// --- Road ---
var roadLayer = L.geoJSON(null, {
  style: { color: '#df2121', weight: 1.5, opacity: 0.8, dashArray: '4 3' },
  onEachFeature: function(feature, layer) {
    var props = feature.properties;
    var name  = props.name || props.NAME || props.road || 'ถนน';
    layer.bindPopup(buildPopup('road', name, props));
    layer.on('click',     function() { showFeatureInfo('road', name, props); });
    layer.on('mouseover', function() { this.setStyle({ color: '#fca5a5', weight: 3 }); });
    layer.on('mouseout',  function() { roadLayer.resetStyle(this); });
  }
});

// --- Landuse (LUBKK) ---
var landuseLayer = L.geoJSON(null, {
  style: function(feature) {
    return getLanduseStyle(feature.properties.LUL1_CODE || '');
  },
  onEachFeature: function(feature, layer) {
    var props   = feature.properties;
    var code    = props.LUL1_CODE || '?';
    var nameTH  = props.LU_DES_TH || (landuseConfig[code] ? landuseConfig[code].label : 'Landuse');
    var nameEN  = props.LU_DES_EN || '';
    var luCode  = props.LU_CODE   || '';
    var areaRai = props.Area_Rai  || '—';

    layer.bindPopup(buildLandusePopup(code, nameTH, nameEN, luCode, areaRai));
    layer.on('click',     function() { showFeatureInfo('landuse', nameTH, props); });
    layer.on('mouseover', function() {
      var cfg = landuseConfig[code] || {};
      this.setStyle({ weight: 2.5, fillOpacity: 0.55 });
    });
    layer.on('mouseout',  function() { landuseLayer.resetStyle(this); });
  }
});


/* ---- 5. Load GeoJSON Data ---- */
var loadedCount = 0;
var totalFiles  = 3;

function checkAllLoaded() {
  loadedCount++;
  if (loadedCount >= totalFiles) {
    document.getElementById('loading-overlay').classList.add('hidden');
  }
}

fetch('mrtkine.geojson')
  .then(function(r) { return r.json(); })
  .then(function(d) {
    mrtLayer.addData(d).addTo(map);
    document.getElementById('mrt-count').textContent = d.features ? d.features.length : 0;
    checkAllLoaded();
  })
  .catch(function(err) {
    console.warn('MRT load error:', err);
    document.getElementById('mrt-count').textContent = '0';
    checkAllLoaded();
  });

fetch('restaurants.geojson')
  .then(function(r) { return r.json(); })
  .then(function(d) {
    resLayer.addData(d).addTo(map);
    document.getElementById('res-count').textContent = d.features ? d.features.length : 0;
    checkAllLoaded();
  })
  .catch(function(err) {
    console.warn('Restaurant load error:', err);
    document.getElementById('res-count').textContent = '0';
    checkAllLoaded();
  });

fetch('THA_road.geojson')
  .then(function(r) { return r.json(); })
  .then(function(d) {
    roadLayer.addData(d); // OFF by default
    checkAllLoaded();
  })
  .catch(function(err) {
    console.warn('Road load error:', err);
    checkAllLoaded();
  });

// Landuse — large file, OFF by default
fetch('LUBKK.geojson')
  .then(function(r) { return r.json(); })
  .then(function(d) {
    landuseLayer.addData(d);
    var count = d.features ? d.features.length : 0;
    document.getElementById('lu-count').textContent = count.toLocaleString();
    console.log('Landuse loaded:', count, 'features');
  })
  .catch(function(err) {
    console.error('LUBKK.geojson load error:', err);
    document.getElementById('lu-count').textContent = '—';
  });


/* ---- 6. Layer Toggle ---- */
function toggleLayer(layerName) {
  var layerMap = {
    mrt:     { layer: mrtLayer,     check: 'mrtCheck'     },
    res:     { layer: resLayer,     check: 'resCheck'     },
    road:    { layer: roadLayer,    check: 'roadCheck'    },
    landuse: { layer: landuseLayer, check: 'landuseCheck' }
  };

  var entry = layerMap[layerName];
  if (!entry) return;

  if (document.getElementById(entry.check).checked) {
    map.addLayer(entry.layer);
    if (layerName === 'landuse') entry.layer.bringToBack();
  } else {
    map.removeLayer(entry.layer);
  }
}


/* ---- 7. Zoom to Layer ---- */
function zoomToLayer(layerName) {
  var layerMap = {
    mrt:     mrtLayer,
    res:     resLayer,
    road:    roadLayer,
    landuse: landuseLayer
  };
  var layer = layerMap[layerName];
  if (!layer) return;
  try {
    var bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    }
  } catch (e) {
    console.warn('Cannot zoom to:', layerName, e);
  }
}

function resetMap() {
  map.setView([13.7563, 100.5018], 12);
}


/* ---- 8. Basemap Switcher ---- */
function changeBasemap(name) {
  Object.values(basemaps).forEach(function(bm) {
    if (map.hasLayer(bm)) map.removeLayer(bm);
  });
  basemaps[name].addTo(map);
  [landuseLayer, roadLayer, mrtLayer, resLayer].forEach(function(l) {
    if (map.hasLayer(l)) l.bringToFront();
  });
  document.querySelectorAll('.basemap-opt').forEach(function(el) {
    el.classList.remove('active');
  });
  var el = document.getElementById('bm-' + name);
  if (el) el.classList.add('active');
}


/* ---- 9. Coordinate Display ---- */
map.on('mousemove', function(e) {
  var lat = e.latlng.lat.toFixed(5);
  var lng = e.latlng.lng.toFixed(5);
  document.getElementById('coord-display').innerHTML =
    '<i class="fa-solid fa-crosshairs"></i> ' + lat + ', ' + lng;
});


/* ---- 10. Popup Builders ---- */
function buildPopup(type, name, props) {
  var typeLabels = { mrt: 'สายรถไฟฟ้า MRT', res: 'ร้านอาหาร', road: 'ถนน' };
  var html = '<div style="min-width:170px">';
  html += '<strong style="font-size:13px">' + name + '</strong><br>';
  html += '<span style="font-size:11px;color:#8b949e">' + (typeLabels[type] || '') + '</span>';
  html += '<hr style="margin:6px 0;border-color:#30363d">';
  var shown = 0;
  for (var key in props) {
    if (shown >= 4) break;
    if (!props[key] && props[key] !== 0) continue;
    if (key === 'name' || key === 'NAME') continue;
    html += '<div style="font-size:11px;margin:2px 0"><span style="color:#8b949e">' +
            key + ':</span> <strong>' + props[key] + '</strong></div>';
    shown++;
  }
  html += '</div>';
  return html;
}

function buildLandusePopup(code, nameTH, nameEN, luCode, areaRai) {
  var cfg  = landuseConfig[code] || { color: '#94a3b8' };
  var html = '<div style="min-width:210px">';
  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
  html += '<div style="width:14px;height:14px;border-radius:3px;background:' + cfg.color + ';flex-shrink:0;box-shadow:0 0 4px ' + cfg.color + '"></div>';
  html += '<strong style="font-size:13px">' + nameTH + '</strong></div>';
  if (nameEN) {
    html += '<div style="font-size:11px;color:#8b949e;margin-bottom:6px">' + nameEN + '</div>';
  }
  html += '<hr style="margin:6px 0;border-color:#30363d">';
  html += '<div style="font-size:11px;margin:2px 0"><span style="color:#8b949e">รหัสประเภท:</span> <strong>' + luCode + '</strong></div>';
  html += '<div style="font-size:11px;margin:2px 0"><span style="color:#8b949e">พื้นที่:</span> <strong>' + areaRai + ' ไร่</strong></div>';
  html += '</div>';
  return html;
}


/* ---- 11. Feature Info Panel ---- */
function showFeatureInfo(type, name, props) {
  var typeLabels = {
    mrt:     'สายรถไฟฟ้า MRT',
    res:     'ร้านอาหาร',
    road:    'ถนน',
    landuse: 'การใช้ที่ดิน'
  };

  var infoDiv = document.getElementById('feature-info');
  var html = '<div class="feature-card">';
  html += '<span class="feature-type type-' + type + '">' + (typeLabels[type] || type) + '</span>';
  html += '<div class="feature-title">' + name + '</div>';

  // For landuse, show key fields in friendly order
  var luKeys = ['LU_CODE','LUL1_CODE','LUL2_CODE','LU_DES_EN','Area_Rai','Area_Sqm'];
  var generalShown = 0;

  if (type === 'landuse') {
    luKeys.forEach(function(key) {
      if (props[key] !== null && props[key] !== undefined && props[key] !== '') {
        html += '<div class="feature-row"><span class="feature-key">' + key +
                '</span><span class="feature-val">' + props[key] + '</span></div>';
        generalShown++;
      }
    });
  } else {
    for (var key in props) {
      if (generalShown >= 7) break;
      if (!props[key] && props[key] !== 0) continue;
      html += '<div class="feature-row"><span class="feature-key">' + key +
              '</span><span class="feature-val">' + props[key] + '</span></div>';
      generalShown++;
    }
  }

  if (generalShown === 0) {
    html += '<div class="feature-row"><span class="feature-key">ข้อมูล</span>' +
            '<span class="feature-val">ไม่มีข้อมูลเพิ่มเติม</span></div>';
  }

  html += '</div>';
  infoDiv.innerHTML = html;
}
