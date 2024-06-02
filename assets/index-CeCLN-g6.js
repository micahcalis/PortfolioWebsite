import*as c from"https://unpkg.com/three@0.127.0/build/three.module.js";(function(){const p=document.createElement("link").relList;if(p&&p.supports&&p.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))f(r);new MutationObserver(r=>{for(const n of r)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&f(o)}).observe(document,{childList:!0,subtree:!0});function g(r){const n={};return r.integrity&&(n.integrity=r.integrity),r.referrerPolicy&&(n.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?n.credentials="include":r.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function f(r){if(r.ep)return;r.ep=!0;const n=g(r);fetch(r.href,n)}})();const H={name:"RayMarch",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		uniform float screenWidth;
		uniform float screenHeight;
		uniform float fieldOfView;

		// raymarch parameters
		uniform int MAX_STEPS;
		uniform float SURF_DIST;
		uniform float MAX_DIST;

		// time
		uniform float iTime;

		// fog parameter
		uniform float absorption;

		// spheres
		uniform int orbNumber;

		// shader variables
		vec4 iter;
		float t0;
		vec4 sphereColors[9] = vec4[9]( 
			vec4(0.81, 0.46, 0.45, 0.9), // Sphere 1
			vec4(0.82, 0.60, 0.50, 0.8), // Sphere 2
			vec4(0.85, 0.85, 0.50, 0.7), // Sphere 3
			vec4(0.67, 0.85, 0.51, 0.6), // Sphere 4
			vec4(0.51, 0.77, 0.72, 0.5), // Sphere 5
			vec4(0.49, 0.73, 0.84, 0.4), // Sphere 6
			vec4(0.52, 0.55, 0.80, 0.3), // Sphere 7
			vec4(0.53, 0.33, 0.74, 0.2), // Sphere 8
			vec4(0.77, 0.40, 0.75, 0.1) ); // Sphere 9
		float steps;
		float alpha;

		// pixel read index + fresnel 
		uniform float read;
		float fresnelMod;
		
		mat2 rot2D(float a) {
			return mat2(cos(a), -sin(a), sin(a), cos(a));
		}

		float remap01(float d, vec2 ab)
		{
			return (d - ab.x) / (ab.y - ab.x);
		}
		
		float posterize(float c, float steps)
		{
			return floor(c / (1.0 / steps)) * (1.0 / steps);
		}

		vec3 RayDirection(float fov, vec2 res, vec2 uv) {
			vec2 xy = uv - res / 2.0;
			float z = res.y / tan(radians(fov) / 2.0);
			return normalize(vec3(xy, -z));
		}

		vec3 RayDirectionTest(float fov, vec2 uv) {
			return normalize(vec3(uv, fov / 10.0));
		}

		float ApollonianSDF( vec3 p ) {

			float s = 3.3f, e;
			iter = vec4(1000.0);
			for ( int i = 0; i++ < 8; ) {
				p = mod( p - 1.0f, 2.0f ) - 1.0f;
				iter = min(iter, vec4(abs(p), dot(p, p)));
				s *= e = 1.3 / dot( p, p );
				p *= e;
			}
			return length( p.yz ) / s;
		}

		float sdSphere( vec3 p, float s )
		{
			return length(p)-s;
		}		
		
		vec4 map(vec3 p)
		{
			vec4 d;
			d.a = MAX_DIST * 2.0;
			vec4 dA = vec4(1.0, 0.0, 0.0, ApollonianSDF(p));
			vec4 dSphere = vec4(0.0, 0.0, 1.0, d.a);
			float stepSize = 6.2831 / float(orbNumber);
			vec3 offset = vec3(-5.0, -5.0, iTime + 3.0);
			float speed = iTime * 0.3;
			alpha = 10.0;
			fresnelMod = 0.0;
			for (int i = 0; i < orbNumber; i++)
			{
				float pathPos = stepSize * float(i);
				vec3 circularPos = vec3(sin(speed + pathPos) * 0.4, cos(speed - 3.1416 + pathPos) * 0.1, cos(speed + pathPos) * 0.4);
				vec4 current = vec4(sphereColors[i].rgb, sdSphere(p + circularPos + offset, 0.1));
				vec4 nm1 = dSphere;
				dSphere.a = min(nm1.a, current.a);
				float tSphere = remap01(dSphere.a, vec2(nm1.a, current.a));
				dSphere.rgb = mix(nm1.rgb, current.rgb, tSphere);
				alpha = mix(alpha, sphereColors[i].a, tSphere);

				// read check
				if (i == int(read) && tSphere > 0.5)
				{
					fresnelMod = mix(0.0, 1.0, tSphere);
				}
				else
				{
					fresnelMod = mix(fresnelMod, 0.0, tSphere);
				}
			}
			// take min's
			d.a = min(d.a, dA.a);
			d.a = min(d.a, dSphere.a);
			// interpolate distances between 0 and 1, then linearly interpolate to find the correct color
			t0 = remap01(d.a, vec2(dSphere.a, dA.a));
			d.rgb = mix(dSphere.rgb, dA.rgb, t0);
			return d;
		}
		
		vec4 RayMarch(vec3 ro, vec3 rd)
		{
			float dO = 0.0;
			float dS;
			vec4 mapVal;
			for (int i = 0; i < MAX_STEPS; i++)
			{
				vec3 pos = ro + dO * rd;
				mapVal = map(pos);
				dS = mapVal.a;
				dO += dS;
				if (dS < SURF_DIST || dO > MAX_DIST)
				{
					steps = float(i);
					break;
				}
			}
			return vec4(mapVal.rgb, dO);
		}

		vec3 GetNormal(vec3 p)
		{
			vec2 offset = vec2(0.01, 0);
			vec3 n = map(p).a - vec3(map(p - offset.xyy).a, map(p - offset.yxy).a, map(p - offset.yyx).a);
			return normalize(n);
		}

		vec3 GetNormalApollonian(vec3 p)
		{
			vec2 delta = vec2(SURF_DIST * 8.0, 0.f);
			return normalize(vec3(
				(ApollonianSDF(p + delta.xyy) - ApollonianSDF(p - delta.xyy)),
				(ApollonianSDF(p + delta.yxy) - ApollonianSDF(p - delta.yxy)),
				(ApollonianSDF(p + delta.yyx) - ApollonianSDF(p - delta.yyx))
				));
		}

		vec3 shadingFractal(vec3 lightDir, vec3 p, vec3 rd)
		{
			// lighting calculations
			vec3 normal = GetNormalApollonian(p);
			float NdotL = dot(normal, lightDir) * 0.5 + 0.5;
			vec3 H = normalize(lightDir + rd);
			float NdotH = dot(normal, H);
			float spec = smoothstep(0.4, 0.7, NdotH);
			float lighting = NdotL + spec * 0.5;
			// main color
			float post = posterize(pow(iter.y, 0.4), 8.0);
			vec3 col = mix(vec3(0.8), vec3(0.7, 0.4, 0.2), post);
			vec3 blendCol = col * lighting;
			return blendCol;
		}

		vec3 standardShading(vec3 lightDir, vec3 p, vec3 rd, vec3 base)
		{
			// lighting calculations
			vec3 normal = GetNormal(p);
			// float NdotL = dot(normal, lightDir) * 0.5 + 0.5;
			// vec3 H = normalize(lightDir + rd);
			// float NdotH = dot(normal, H);
			// float spec = smoothstep(0.4, 0.7, NdotH);
			// float lighting = NdotL + spec * 0.5;
			// ambient occlusion
			float ao = 1.0 - (steps / float(MAX_STEPS));
			// metallic lighting
			float NdotR = pow(max(0.0, dot(normal, -rd)), 2.0);
			float lighting = NdotR * ao + 0.4;
			// main color
			vec3 blendCol = base * lighting;
			float fresnel = (dot(rd, normal) + 1.0) * fresnelMod;
			vec3 fresnelCol = mix(blendCol, vec3(1.0), fresnel);
			return vec3(fresnelCol);
		}

		void main() {
			// sample camera texture
			//vec4 texel = texture2D( tDiffuse, vUv );
			// modify UV
			float aspect = screenWidth / screenHeight;
			vec2 uv = vUv - 0.5;
			vec3 test = RayDirectionTest(25.0, uv * 2.0);
			// for full screen shader, use modUV, else use uv => nvm idk what im doimg
			vec2 modUV = vec2(uv.x * aspect, uv.y);
			// get ray direction
			vec2 resolution = vec2(screenWidth, screenHeight);
			vec2 fragCoord = (screenHeight * modUV + resolution) / 2.0;
			vec3 rd = RayDirection(fieldOfView, resolution, fragCoord);
			// Set ray origin
			vec3 ro = vec3(5.0, 5.0, -iTime);
			//vec3 ro = vec3(0.0, 0.0, 10.0);
			// Raymarch!
			vec4 d = RayMarch(ro, rd);
			if (d.a < MAX_DIST)
			{
				// get position from raymarch data
				vec3 pos = ro + rd * d.a;
				// define sun direction and create color
				vec3 lightDir = vec3(0.0, 0.5, 0.5);
				vec3 col;
				if (t0 > 0.5)
				{
					col.rgb = shadingFractal(lightDir, pos, rd);
					alpha = 1.0;
				}
				else
				{
					col = standardShading(lightDir, pos, rd, d.rgb);
				}
				// get depth and apply fog
				float depth = distance(ro, pos) / MAX_DIST;
				float e = 2.71828; // euler
				float beer = pow(e, -depth * absorption);
				col = mix(vec3(0.75, 0.9, 0.96), col, beer);
				gl_FragColor = vec4(col, alpha);
			}
			else
			{
				// sky color
				vec3 skyCol = normalize(vec3(95.0, 158.0, 160.0));
				// distance from center
				float dis = distance(modUV, vec2(0.0, 0.0));
				float t = clamp(0.0, 1.0, dis / 1.5);
				// lerp with sky color
				skyCol = mix(vec3(0.0), skyCol, t);
				gl_FragColor = vec4(0.75, 0.9, 0.96, 1.0);
			}
		}`},W={name:"FullscreenUnlit",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(texel.rgb, 1.0);
		}`};class J{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=I(),this._delta=0,this._elapsed=0,this._timescale=1,this._usePageVisibilityAPI=typeof document<"u"&&document.hidden!==void 0,this._usePageVisibilityAPI===!0&&(this._pageVisibilityHandler=K.bind(this),document.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(p){return this._timescale=p,this}reset(){return this._currentTime=I()-this._startTime,this}dispose(){return this._usePageVisibilityAPI===!0&&document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this}update(p){return this._usePageVisibilityAPI===!0&&document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(p!==void 0?p:I())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}function I(){return(typeof performance>"u"?Date:performance).now()}function K(){document.hidden===!1&&this.reset()}var Q=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function Z(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}var X={exports:{}};(function(t,p){(function(g,f){t.exports=f()})(Q,function(){var g=function(){function f(l){return o.appendChild(l.dom),l}function r(l){for(var d=0;d<o.children.length;d++)o.children[d].style.display=d===l?"block":"none";n=l}var n=0,o=document.createElement("div");o.style.cssText="position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000",o.addEventListener("click",function(l){l.preventDefault(),r(++n%o.children.length)},!1);var y=(performance||Date).now(),v=y,a=0,D=f(new g.Panel("FPS","#0ff","#002")),M=f(new g.Panel("MS","#0f0","#020"));if(self.performance&&self.performance.memory)var _=f(new g.Panel("MB","#f08","#201"));return r(0),{REVISION:16,dom:o,addPanel:f,showPanel:r,begin:function(){y=(performance||Date).now()},end:function(){a++;var l=(performance||Date).now();if(M.update(l-y,200),l>v+1e3&&(D.update(1e3*a/(l-v),100),v=l,a=0,_)){var d=performance.memory;_.update(d.usedJSHeapSize/1048576,d.jsHeapSizeLimit/1048576)}return l},update:function(){y=this.end()},domElement:o,setMode:r}};return g.Panel=function(f,r,n){var o=1/0,y=0,v=Math.round,a=v(window.devicePixelRatio||1),D=80*a,M=48*a,_=3*a,l=2*a,d=3*a,b=15*a,x=74*a,S=30*a,w=document.createElement("canvas");w.width=D,w.height=M,w.style.cssText="width:80px;height:48px";var i=w.getContext("2d");return i.font="bold "+9*a+"px Helvetica,Arial,sans-serif",i.textBaseline="top",i.fillStyle=n,i.fillRect(0,0,D,M),i.fillStyle=r,i.fillText(f,_,l),i.fillRect(d,b,x,S),i.fillStyle=n,i.globalAlpha=.9,i.fillRect(d,b,x,S),{dom:w,update:function(P,Y){o=Math.min(o,P),y=Math.max(y,P),i.fillStyle=n,i.globalAlpha=1,i.fillRect(0,0,D,b),i.fillStyle=r,i.fillText(v(P)+" "+f+" ("+v(o)+"-"+v(y)+")",_,l),i.drawImage(w,d+a,b,x-a,S,d,b,x-a,S),i.fillRect(d+x-a,b,a,S),i.fillStyle=n,i.globalAlpha=.9,i.fillRect(d+x-a,b,a,v((1-P/Y)*S))}}},g})})(X);var ee=X.exports;const te=Z(ee),re=75;let G=new c.Scene,j=new c.Scene;const U=new c.OrthographicCamera(-1,1,1,-1,0,1),m=new c.WebGLRenderer;m.setSize(window.innerWidth,window.innerHeight);m.autoClear=!1;document.body.appendChild(m.domElement);const T=new c.WebGLRenderTarget(window.innerWidth,window.innerHeight,{format:c.RGBAFormat,type:c.FloatType}),u=new c.ShaderMaterial({uniforms:{tDiffuse:{value:T.texture}},vertexShader:H.vertexShader,fragmentShader:H.fragmentShader,depthWrite:!1}),ae=new c.Mesh(new c.PlaneGeometry(2,2,1,1),u);G.add(ae);const F=new c.ShaderMaterial({uniforms:{tDiffuse:{value:T.texture}},vertexShader:W.vertexShader,fragmentShader:W.fragmentShader,depthWrite:!1}),ie=new c.Mesh(new c.PlaneGeometry(2,2,1,1),F);j.add(ie);const z=new J,k=new c.Vector2,A=new c.Vector2;document.addEventListener("mousemove",function(t){k.x=t.clientX/window.innerWidth,k.y=1-t.clientY/window.innerHeight,A.x=t.pageX,A.y=t.pageY,O.style.left=A.x+"px",O.style.top=A.y+"px"});document.addEventListener("click",function(t){!R&&s<999&&(de(),R=!0)});addEventListener("resize",()=>{console.log("resize"),m.setSize(window.innerWidth,window.innerHeight)},!1);const E=new te;E.showPanel(0);document.body.appendChild(E.dom);var ne=60,V,N=Date.now(),L=1e3/ne,C;let s,R=!1;const O=document.getElementById("cursorUI"),h=document.getElementById("cursorText"),e=document.getElementById("cursorImage"),B=new c.Vector2(window.innerWidth,window.innerHeight);function oe(t){u.uniforms.iTime={value:t},u.uniforms.screenWidth={value:window.innerWidth},u.uniforms.screenHeight={value:window.innerHeight},u.uniforms.fieldOfView={value:re},u.uniforms.MAX_STEPS={value:100},u.uniforms.SURF_DIST={value:.001},u.uniforms.MAX_DIST={value:20},u.uniforms.absorption={value:2},u.uniforms.orbNumber={value:9}}function le(){const t=new Float32Array(4);switch(m.readRenderTargetPixels(T,k.x*B.x,k.y*B.y,1,1,t),Math.round(t[3]*10)){case 1:s=8;break;case 2:s=7;break;case 3:s=6;break;case 4:s=5;break;case 5:s=4;break;case 6:s=3;break;case 7:s=2;break;case 8:s=1;break;case 9:s=0;break;default:s=1e3;break}u.uniforms.read={value:s},F.uniforms.tDiffuse={value:T.texture}}function se(){m.clear(),m.setRenderTarget(T),m.clear(),m.render(G,U),m.setRenderTarget(null),m.render(j,U)}function ce(){var t=t=document.getElementById("closeTab");t&&t.addEventListener("click",function(){pe()})}function de(){switch(s){case 0:$("#pageMain").load("pages/page1.html");break;case 1:$("#pageMain").load("pages/page2.html");break;case 2:$("#pageMain").load("pages/page3.html");break;case 3:$("#pageMain").load("pages/page4.html");break;case 4:$("#pageMain").load("pages/page5.html");break;case 5:$("#pageMain").load("pages/page6.html");break;case 6:$("#pageMain").load("pages/page7.html");break;case 7:$("#pageMain").load("pages/page8.html");break;case 8:$("#pageMain").load("pages/page9.html");break}}function pe(){var t=document.getElementById("pageMain");t.innerHTML="",R=!1}function fe(){switch(s){case 0:h.innerText="About Me",e.style.width="120px",e.src="pages/images/page 1/1.png",e.style.borderWidth="5px";break;case 1:h.innerText="Artemis",e.style.width="150px",e.src="pages/images/page 2/1.png",e.style.borderWidth="5px";break;case 2:h.innerText="Ans",e.style.width="150px",e.src="pages/images/page 3/1.png",e.style.borderWidth="5px";break;case 3:h.innerText="Bounce Bomb Fury",e.style.width="150px",e.src="pages/images/page 4/1.png",e.style.borderWidth="5px";break;case 4:h.innerText="Burning Memory",e.style.width="200px",e.src="pages/images/page 5/1.jpg",e.style.borderWidth="5px";break;case 5:h.innerText="Under Our Wings",e.style.width="150px",e.src="pages/images/page 6/1.png",e.style.borderWidth="5px";break;case 6:h.innerText="Audio-Reactive TV",e.style.width="180px",e.src="pages/images/page 7/1.png",e.style.borderWidth="5px";break;case 7:h.innerText="Boozy Boa",e.style.width="200px",e.src="pages/images/page 8/1.png",e.style.borderWidth="5px";break;case 8:h.innerText="Shader Experiments",e.style.width="150px",e.src="pages/images/page 9/1.png",e.style.borderWidth="5px";break;default:h.innerText="",e.style.width="0px",e.src="",e.style.borderWidth="0px";break}}function q(t){requestAnimationFrame(q),z.update(t);const p=z.getElapsed();V=Date.now(),C=V-N,C>L&&(E.begin(),N=V-C%L,oe(p),R?(s=1e3,u.uniforms.read={value:s},F.uniforms.tDiffuse={value:T.texture}):le(),ce(),fe(),se(),E.end())}q();
