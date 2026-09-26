import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { leafletCss, leafletJs } from '@/vendor/leaflet';

export type Pin = { id: string; lat: number; lng: number; friends: boolean };
// pad: çemberin sığacağı alan; üstte başlık, altta sürgü ya da kart kadar boşluk bırakılır
// liveKm: sürgü sürüklenirken çemberin o anki yarıçapı (harita yerinden oynamaz); km bırakılınca gelir
type Props = { lat: number; lng: number; km: number; liveKm?: number; me: [number, number] | null; pins: Pin[]; picked: string | null; onPick: (id: string | null) => void; pad: { top: number; bottom: number } };

// harita, webview içinde: leaflet (pakete gömülü) + esri "dark gray canvas" karoları. anahtar gerekmez;
// carto'nun ücretsiz karoları anahtarsız isteklere filigran basıyor, o yüzden esri.
// webview dışarıya gidemez: sayfa içi gezinme kapalı, dosya erişimi kapalı, sadece karo isteği çıkar.
// mürekkep görünümü css ile: karolar koyulaştırılır, geceler küçük kareler, yarıçap kırmızı çember.
const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${leafletCss}</style>
<script>${leafletJs}</script>
<style>
  html,body,#m{margin:0;height:100%;background:#0e0d0c}
  .leaflet-tile{filter:brightness(.55) contrast(1.15) saturate(0)}
  .leaflet-control-attribution{background:rgba(14,13,12,.8)!important;color:#8a877f!important;font:10px Inter,system-ui,sans-serif;padding:2px 6px}
  .leaflet-control-attribution a{color:#8a877f!important}
  /* geceler küçük kâğıt kareler; arkadaşın tuttuğu kırmızı; seçilince çerçeveli, diğerleri %45 */
  .sq{width:12px;height:12px;background:#f3f1ec;box-sizing:border-box;transition:opacity .3s ease-out}
  .sq.fr{background:#d7261e}
  .sq.on{background:#d7261e;outline:1.5px solid #f3f1ec;outline-offset:4px}
  .dim .sq:not(.on){opacity:.45}
  /* ben: içi boş kare */
  .me{width:12px;height:12px;border:1.5px solid #f3f1ec;box-sizing:border-box;background:transparent}
</style></head><body><div id="m"></div><script>
  var map=L.map('m',{zoomControl:false,attributionControl:true,zoomSnap:0.5}).setView([48.137,11.575],13);
  map.attributionControl.setPrefix(false);
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var esri='https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  L.tileLayer(esri+'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:18,attribution:'&copy; Esri, HERE, Garmin, OpenStreetMap contributors · v2'}).addTo(map);
  L.tileLayer(esri+'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:18,opacity:.6}).addTo(map);
  var layer=L.layerGroup().addTo(map), meMarker=null, markers={}, ring=null;
  function post(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m));}
  map.on('click',function(){post({pick:null});});
  window.update=function(s){
    if(s.ring!==undefined&&ring){ring.setRadius(s.ring*1000);}
    if(s.view){
      var c=[s.view.lat,s.view.lng], r=s.view.km*1000;
      if(!ring){ring=L.circle(c,{radius:r,color:'#d7261e',weight:1,fill:false,interactive:false}).addTo(map);}else{ring.setLatLng(c);ring.setRadius(r);}
      map.fitBounds(ring.getBounds(),{paddingTopLeft:[28,s.view.top],paddingBottomRight:[28,s.view.bottom],animate:true});
    }
    if(s.me){if(!meMarker){meMarker=L.marker([s.me[0],s.me[1]],{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[12,12],iconAnchor:[6,6]}),interactive:false}).addTo(map);}else{meMarker.setLatLng([s.me[0],s.me[1]]);}}
    if(s.pins){layer.clearLayers();markers={};s.pins.forEach(function(p){
      var ic=L.divIcon({className:'',html:'<div class="sq'+(p.friends?' fr':'')+(p.id===s.picked?' on':'')+'" data-f="'+(p.friends?1:0)+'"></div>',iconSize:[12,12],iconAnchor:[6,6]});
      var mk=L.marker([p.lat,p.lng],{icon:ic}).addTo(layer);mk.on('click',function(e){L.DomEvent.stopPropagation(e);post({pick:p.id});});markers[p.id]=mk;});}
    else if(s.picked!==undefined){Object.keys(markers).forEach(function(id){var el=markers[id].getElement();if(el){var d=el.querySelector('.sq');if(d)d.className='sq'+(d.getAttribute('data-f')==='1'?' fr':'')+(id===s.picked?' on':'');}});}
    if(s.picked!==undefined){document.body.classList.toggle('dim',!!s.picked);}
  };
  post({ready:true});
</script></body></html>`;


export default function MapWeb({ lat, lng, km, liveKm, me, pins, picked, onPick, pad }: Props) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const send = (s: object) => ref.current?.injectJavaScript(`window.update(${JSON.stringify(s)});true;`);

  const pinsKey = useMemo(() => JSON.stringify(pins), [pins]);
  useEffect(() => {
    if (ready.current) send({ view: { lat, lng, km, top: pad.top, bottom: pad.bottom } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, km]);
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
          /* yut */
        }
      }}
    />
  );
}
