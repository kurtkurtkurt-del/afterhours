import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { leafletCss, leafletJs } from '@/vendor/leaflet';
import { colors, tint } from '@/theme/tokens';

export type Pin = { id: string; lat: number; lng: number; friends: boolean; spark?: boolean };
// pad: the area the circle must fit in, leaving room for the header above and the slider or card below
// liveKm: circle radius while the slider is dragged (the map does not move); km arrives on release
type Props = { lat: number; lng: number; km: number; liveKm?: number; me: [number, number] | null; pins: Pin[]; picked: string | null; onPick: (id: string | null) => void; pad: { top: number; bottom: number }; recenter?: number };

// Map in a WebView: Leaflet (bundled) + Esri "Dark Gray Canvas" tiles, no key needed;
// Carto's free tiles watermark keyless requests, hence Esri.
// The WebView cannot navigate away: in-page navigation and file access are off; only tile requests leave.
// The ink look is CSS: darkened tiles, nights as map pins, a red radius circle.
const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${leafletCss}</style>
<script>${leafletJs}</script>
<style>
  /* The ground under the tiles is the tiles' own tone, so a tile still on its way
     shows as map, not as a black hole (it was "going dark" while moving). */
  html,body,#m{margin:0;height:100%;background:#1b1a19}
  .leaflet-container{background:#1b1a19}
  .leaflet-tile{filter:brightness(.55) contrast(1.15) saturate(0)}
  .leaflet-control-attribution{background:rgba(14,13,12,.8)!important;color:#8a877f!important;font:10px Inter,system-ui,sans-serif;padding:2px 6px}
  .leaflet-control-attribution a{color:#8a877f!important}
  /* Nights are map pins: a rounded drop pointing at the spot, an ink hole in it and a
     soft shadow on the ground. Paper; red when a friend kept it; the selected one grows
     and turns red with a paper ring, the rest at 45%. The pin stands on its tip. */
  .pin{position:relative;width:22px;height:24px}
  .sq{position:absolute;left:3px;top:1px;width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);transform-origin:50% 50%;background:#f3f1ec;box-shadow:0 2px 6px rgba(0,0,0,.55);transition:opacity .3s ease-out,transform .2s ease-out}
  .sq:after{content:'';position:absolute;left:5px;top:5px;width:6px;height:6px;border-radius:50%;background:#0e0d0c}
  .sq.fr{background:${colors.spot}}
  .sq.on{background:${colors.spot};transform:rotate(-45deg) scale(1.3);box-shadow:0 0 0 2px #f3f1ec,0 3px 10px rgba(0,0,0,.6)}
  .sq.on:after{background:#f3f1ec}
  /* Sparks: gold, a rounded diamond instead of a drop, so they never read as a night. */
  .sq.sp{background:#e8b04b;border-radius:4px;transform:rotate(45deg) scale(.85);top:4px}
  .sq.sp.on{transform:rotate(45deg) scale(1.1);box-shadow:0 0 0 2px #e8b04b,0 3px 10px rgba(0,0,0,.6)}
  .sq.sp.on:after{background:#0e0d0c}
  .dim .sq:not(.on){opacity:.45}
  /* The shadow on the ground under the tip. */
  .pin:before{content:'';position:absolute;left:7px;bottom:0;width:8px;height:3px;border-radius:50%;background:rgba(0,0,0,.55)}
  /* Radar: each night sends out a ring from where it stands, widening and fading every
     3.2 s. Each starts at its own moment (from its id) and stays small, so neighbours
     ripple one after another instead of melting into one blur. */
  .rp{position:absolute;left:5px;bottom:-3px;width:12px;height:12px;border-radius:50%;box-sizing:border-box;border:1.5px solid rgba(243,241,236,.6);animation:radar 3.2s ease-out infinite both;pointer-events:none}
  .pin.f1 .rp{border-color:${tint(0.8)}}
  .pin.fs .rp{border-color:rgba(232,176,75,.85)}
  .dim .rp{visibility:hidden}
  @keyframes radar{0%{transform:scale(1);opacity:.95}75%{opacity:0}100%{transform:scale(3.4);opacity:0}}
  /* You: a round puck, so you never read as a night (nights are pins): a paper disc
     with an ink gap and a red rim, a red core, and a slow red ping around it. */
  .me{position:relative;width:22px;height:22px}
  .me i{position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:${colors.spot};animation:ping 2.4s ease-out infinite}
  .me b{position:absolute;left:4px;top:4px;width:14px;height:14px;border-radius:50%;background:#f3f1ec;box-shadow:0 0 0 2px #0e0d0c,0 0 0 3.5px ${colors.spot}}
  .me b:after{content:'';position:absolute;left:4px;top:4px;width:6px;height:6px;border-radius:50%;background:${colors.spot}}
  @keyframes ping{0%{transform:scale(.6);opacity:.5}100%{transform:scale(2.6);opacity:0}}
</style></head><body><div id="m"></div><script>
  var map=L.map('m',{zoomControl:false,attributionControl:true,zoomSnap:1,doubleClickZoom:false,fadeAnimation:false}).setView([48.137,11.575],13);
  map.attributionControl.setPrefix(false);
  /* One-finger zoom, as in Google Maps: tap, then touch again and drag without lifting.
     Down zooms in, up zooms out, around the spot you touched. A double tap without a
     drag zooms in one step. Listened to on window in the capture phase, so Leaflet
     never sees these touches as a pan. */
  (function(){
    var c=map.getContainer(), tap=null, last=null, dz=null;
    function at(t){var r=c.getBoundingClientRect();return L.point(t.clientX-r.left,t.clientY-r.top);}
    function stop(e){e.preventDefault();e.stopPropagation();}
    window.addEventListener('touchstart',function(e){
      if(e.touches.length!==1){dz=null;tap=null;return;}
      var t=e.touches[0], now=Date.now();
      if(last&&now-last.at<320&&Math.abs(t.clientX-last.x)<40&&Math.abs(t.clientY-last.y)<40){
        dz={y:t.clientY,z:map.getZoom(),p:at(t),moved:false};
        map.dragging.disable();map.options.zoomSnap=0;last=null;stop(e);return;
      }
      tap={at:now,x:t.clientX,y:t.clientY};
    },{capture:true,passive:false});
    window.addEventListener('touchmove',function(e){
      if(!dz)return;
      if(e.touches.length!==1){return;}
      var dy=e.touches[0].clientY-dz.y;
      if(Math.abs(dy)>6)dz.moved=true;
      if(dz.moved){
        var z=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),dz.z+dy/110));
        map.setZoomAround(dz.p,z,{animate:false});
      }
      stop(e);
    },{capture:true,passive:false});
    function end(e){
      if(dz){
        var d=dz;dz=null;map.options.zoomSnap=1;map.dragging.enable();
        if(d.moved)map.setZoomAround(d.p,Math.round(map.getZoom()),{animate:false});
        else map.setZoomAround(d.p,Math.min(map.getMaxZoom(),d.z+1));
        stop(e);return;
      }
      if(tap&&e.changedTouches.length===1){
        var t=e.changedTouches[0];
        last=(Date.now()-tap.at<260&&Math.abs(t.clientX-tap.x)<12&&Math.abs(t.clientY-tap.y)<12)?{at:Date.now(),x:t.clientX,y:t.clientY}:null;
      }
      tap=null;
    }
    window.addEventListener('touchend',end,{capture:true,passive:false});
    window.addEventListener('touchcancel',function(){if(dz){dz=null;map.options.zoomSnap=1;map.dragging.enable();}tap=null;},{capture:true});
  })();
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var esri='https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  /* Leaflet on a phone only asks for new tiles once the finger stops (updateWhenIdle)
     and keeps two rings of tiles around the screen: moving showed empty, dark squares.
     Now tiles load while moving, more of them are kept, and they appear without a fade. */
  var tiles={maxNativeZoom:16,maxZoom:18,updateWhenIdle:false,updateWhenZooming:true,updateInterval:100,keepBuffer:6};
  L.tileLayer(esri+'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',L.extend({attribution:'&copy; Esri, HERE, Garmin, OpenStreetMap contributors · v2'},tiles)).addTo(map);
  L.tileLayer(esri+'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',L.extend({opacity:.9},tiles)).addTo(map);
  var layer=L.layerGroup().addTo(map), meMarker=null, markers={}, ring=null;
  function post(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m));}
  map.on('click',function(){post({pick:null});});
  /* The circle fills the free area. While the slider is dragged the zoom is not
     snapped, so the map follows the finger smoothly (no animation then). Everywhere
     else the zoom stays on whole levels: tiles are drawn for whole levels only, and
     in between they are stretched and the names go blurry. On a whole level the
     circle fits inside, sometimes with some room around it. */
  var pad={top:0,bottom:0};
  function fit(animate){
    /* The page can be told where to look before the WebView has its final size
       (it opens at 0×0 behind the tab); Leaflet then fits the circle into nothing and
       the map starts off-centre until something moves it. Measure first. */
    map.invalidateSize({pan:false});
    /* No size yet: fitting now would zoom all the way in. resized() fits once there is one. */
    var z=map.getSize();if(!z.x||!z.y)return;
    map.options.zoomSnap=animate?1:0;
    map.fitBounds(ring.getBounds(),{paddingTopLeft:[28,pad.top],paddingBottomRight:[28,pad.bottom],animate:animate});
    map.options.zoomSnap=1;
  }
  window.update=function(s){
    if(s.ring!==undefined&&ring){ring.setRadius(s.ring*1000);fit(false);}
    if(s.view){
      var c=[s.view.lat,s.view.lng], r=s.view.km*1000;
      pad={top:s.view.top,bottom:s.view.bottom};
      if(!ring){ring=L.circle(c,{radius:r,color:'${colors.spot}',weight:1,fill:false,interactive:false}).addTo(map);}else{ring.setLatLng(c);ring.setRadius(r);}
      fit(true);
    }
    if(s.me){if(!meMarker){meMarker=L.marker([s.me[0],s.me[1]],{icon:L.divIcon({className:'',html:'<div class="me"><i></i><b></b></div>',iconSize:[22,22],iconAnchor:[11,11]}),interactive:false,zIndexOffset:1000}).addTo(map);}else{meMarker.setLatLng([s.me[0],s.me[1]]);}}
    if(s.pins){layer.clearLayers();markers={};s.pins.forEach(function(p){
      var f=p.spark?'s':p.friends?'1':'0', d=0; for(var i=0;i<p.id.length;i++){d=(d*31+p.id.charCodeAt(i))%3200;}
      var ic=L.divIcon({className:'',html:'<div class="pin f'+f+'"><i class="rp" style="animation-delay:-'+d+'ms"></i><div class="sq'+(p.spark?' sp':p.friends?' fr':'')+(p.id===s.picked?' on':'')+'" data-f="'+(p.spark?'s':p.friends?1:0)+'"></div></div>',iconSize:[22,24],iconAnchor:[11,21]});
      var mk=L.marker([p.lat,p.lng],{icon:ic}).addTo(layer);mk.on('click',function(e){L.DomEvent.stopPropagation(e);post({pick:p.id});});markers[p.id]=mk;});}
    else if(s.picked!==undefined){Object.keys(markers).forEach(function(id){var el=markers[id].getElement();if(el){var d=el.querySelector('.sq');if(d){var f=d.getAttribute('data-f');d.className='sq'+(f==='s'?' sp':f==='1'?' fr':'')+(id===s.picked?' on':'');}}});}
    if(s.picked!==undefined){document.body.classList.toggle('dim',!!s.picked);}
  };
  /* When the page gets its real size (or it changes), fit the circle again. */
  var lastSize='';
  function resized(){map.invalidateSize({pan:false});var z=map.getSize(),k=z.x+'x'+z.y;if(k===lastSize||!z.x||!z.y)return;lastSize=k;if(ring)fit(false);}
  window.addEventListener('resize',resized);
  if(window.ResizeObserver)new ResizeObserver(resized).observe(document.getElementById('m'));
  post({ready:true});
</script></body></html>`;


// recenter: bump it to fit the view on lat/lng/km again after the map was panned.
export default function MapWeb({ lat, lng, km, liveKm, me, pins, picked, onPick, pad, recenter = 0 }: Props) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const send = (s: object) => ref.current?.injectJavaScript(`window.update(${JSON.stringify(s)});true;`);

  const pinsKey = useMemo(() => JSON.stringify(pins), [pins]);
  useEffect(() => {
    if (ready.current) send({ view: { lat, lng, km, top: pad.top, bottom: pad.bottom } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, km, recenter]);
  useEffect(() => {
    if (ready.current) send({ pins, picked });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsKey]);
  useEffect(() => {
    if (ready.current) send({ picked });
  }, [picked]);
  useEffect(() => {
    if (ready.current && liveKm !== undefined) send({ ring: liveKm });
  }, [liveKm]);
  useEffect(() => {
    if (ready.current && me) send({ me });
  }, [me]);

  return (
    <WebView
      ref={ref}
      source={{ html }}
      key={String(html.length)}
      incognito
      cacheEnabled={false}
      cacheMode="LOAD_NO_CACHE"
      style={StyleSheet.absoluteFill}
      containerStyle={{ backgroundColor: '#0e0d0c' }}
      javaScriptEnabled
      domStorageEnabled={false}
      allowFileAccess={false}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      setSupportMultipleWindows={false}
      originWhitelist={['about:blank', 'about:srcdoc']}
      onShouldStartLoadWithRequest={(req) => req.url.startsWith('about:')}
      onMessage={(e) => {
        try {
          const m = JSON.parse(e.nativeEvent.data);
          if (m.ready) {
            ready.current = true;
            send({ view: { lat, lng, km, top: pad.top, bottom: pad.bottom }, pins, picked, me: me ?? undefined });
          } else if ('pick' in m) onPick(m.pick);
        } catch {
          /* ignore */
        }
      }}
    />
  );
}
