import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { leafletCss, leafletJs } from '@/vendor/leaflet';

export type Pin = { id: string; lat: number; lng: number; code: string };
type Props = { lat: number; lng: number; km: number; me: [number, number] | null; pins: Pin[]; picked: string | null; onPick: (id: string | null) => void };

// harita, webview içinde: leaflet (pakete gömülü) + esri "dark gray canvas" karoları. anahtar gerekmez;
// carto'nun ücretsiz karoları anahtarsız isteklere filigran basıyor, o yüzden esri.
// webview dışarıya gidemez: sayfa içi gezinme kapalı, dosya erişimi kapalı, sadece karo isteği çıkar.
// mürekkep görünümü css ile: karolar hafif koyulaştırılır, pinler kâğıt kareler.
const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${leafletCss}</style>
<script>${leafletJs}</script>
<style>
  html,body,#m{margin:0;height:100%;background:#161512}
  .leaflet-tile{filter:brightness(.55) contrast(1.15) saturate(0)}
  .leaflet-control-attribution{background:rgba(22,21,18,.8)!important;color:#8a877f!important;font:10px Inter,system-ui,sans-serif;padding:2px 6px}
  .leaflet-control-attribution a{color:#8a877f!important}
  .pin{background:#f3f1ec;color:#161512;border:1px solid #161512;font:500 10px/1 Inter,system-ui,sans-serif;letter-spacing:.5px;padding:4px 6px;white-space:nowrap;box-sizing:border-box}
  .pin.on{background:#2b3ecf;color:#f3f1ec;border-color:#2b3ecf}
  .me{width:12px;height:12px;border-radius:50%;background:#2b3ecf;border:2px solid #f3f1ec;box-sizing:border-box}
</style></head><body><div id="m"></div><script>
  var map=L.map('m',{zoomControl:false,attributionControl:true,zoomSnap:0.5}).setView([48.137,11.575],13);
  map.attributionControl.setPrefix(false);
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var esri='https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  L.tileLayer(esri+'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:18,attribution:'&copy; Esri, HERE, Garmin, OpenStreetMap contributors · v2'}).addTo(map);
  L.tileLayer(esri+'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:18,opacity:.6}).addTo(map);
  var layer=L.layerGroup().addTo(map), meMarker=null, markers={};
  function post(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m));}
  map.on('click',function(){post({pick:null});});
  window.update=function(s){
    if(s.view){map.setView([s.view.lat,s.view.lng],s.view.zoom,{animate:true});}
    if(s.me){if(!meMarker){meMarker=L.marker([s.me[0],s.me[1]],{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[12,12],iconAnchor:[6,6]}),interactive:false}).addTo(map);}else{meMarker.setLatLng([s.me[0],s.me[1]]);}}
    if(s.pins){layer.clearLayers();markers={};s.pins.forEach(function(p){
      var ic=L.divIcon({className:'',html:'<div class="pin'+(p.id===s.picked?' on':'')+'">'+esc(p.code)+'</div>',iconSize:null,iconAnchor:[14,10]});
      var mk=L.marker([p.lat,p.lng],{icon:ic}).addTo(layer);mk.on('click',function(e){L.DomEvent.stopPropagation(e);post({pick:p.id});});markers[p.id]=mk;});}
    else if(s.picked!==undefined){Object.keys(markers).forEach(function(id){var el=markers[id].getElement();if(el){var d=el.querySelector('.pin');if(d)d.className='pin'+(id===s.picked?' on':'');}});}
  };
  post({ready:true});
</script></body></html>`;

// yarıçap → zoom: 1 km 15, 3 km 13.5, 10 km 12
const zoomFor = (km: number) => (km <= 1 ? 15 : km <= 3 ? 13.5 : 11.5);

export default function MapWeb({ lat, lng, km, me, pins, picked, onPick }: Props) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const send = (s: object) => ref.current?.injectJavaScript(`window.update(${JSON.stringify(s)});true;`);

  const pinsKey = useMemo(() => JSON.stringify(pins), [pins]);
  useEffect(() => {
    if (ready.current) send({ view: { lat, lng, zoom: zoomFor(km) } });
  }, [lat, lng, km]);
  useEffect(() => {
    if (ready.current) send({ pins, picked });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsKey]);
  useEffect(() => {
    if (ready.current) send({ picked });
  }, [picked]);
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
      containerStyle={{ backgroundColor: '#161512' }}
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
            send({ view: { lat, lng, zoom: zoomFor(km) }, pins, picked, me: me ?? undefined });
          } else if ('pick' in m) onPick(m.pick);
        } catch {
          /* yut */
        }
      }}
    />
  );
}
