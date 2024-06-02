import*as a from"https://unpkg.com/three@0.165.0/build/three.module.js";(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))b(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const u of s.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&b(u)}).observe(document,{childList:!0,subtree:!0});function F(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function b(i){if(i.ep)return;i.ep=!0;const s=F(i);fetch(i.href,s)}})();const x={name:"RayMarch",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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
		}`},S={name:"FullscreenUnlit",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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
		}`};class I{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=h(),this._delta=0,this._elapsed=0,this._timescale=1,this._usePageVisibilityAPI=typeof document<"u"&&document.hidden!==void 0,this._usePageVisibilityAPI===!0&&(this._pageVisibilityHandler=W.bind(this),document.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(n){return this._timescale=n,this}reset(){return this._currentTime=h()-this._startTime,this}dispose(){return this._usePageVisibilityAPI===!0&&document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this}update(n){return this._usePageVisibilityAPI===!0&&document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(n!==void 0?n:h())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}function h(){return(typeof performance>"u"?Date:performance).now()}function W(){document.hidden===!1&&this.reset()}const H=75;let k=new a.Scene,P=new a.Scene;const w=new a.OrthographicCamera(-1,1,1,-1,0,1),l=new a.WebGLRenderer;l.setSize(window.innerWidth,window.innerHeight);l.autoClear=!1;document.body.appendChild(l.domElement);const d=new a.WebGLRenderTarget(window.innerWidth,window.innerHeight,{format:a.RGBAFormat,type:a.FloatType}),o=new a.ShaderMaterial({uniforms:{tDiffuse:{value:d.texture}},vertexShader:x.vertexShader,fragmentShader:x.fragmentShader,depthWrite:!1}),U=new a.Mesh(new a.PlaneGeometry(2,2,1,1),o);k.add(U);const y=new a.ShaderMaterial({uniforms:{tDiffuse:{value:d.texture}},vertexShader:S.vertexShader,fragmentShader:S.fragmentShader,depthWrite:!1}),C=new a.Mesh(new a.PlaneGeometry(2,2,1,1),y);P.add(C);const T=new I,f=new a.Vector2,p=new a.Vector2;document.addEventListener("mousemove",function(t){f.x=t.clientX/window.innerWidth,f.y=1-t.clientY/window.innerHeight,p.x=t.pageX,p.y=t.pageY,M.style.left=p.x+"px",M.style.top=p.y+"px"});document.addEventListener("click",function(t){!m&&r<999&&(O(),m=!0)});addEventListener("resize",()=>{console.log("resize"),l.setSize(window.innerWidth,window.innerHeight)},!1);var R=60,v,D=Date.now(),_=1e3/R,g;let r,m=!1;const M=document.getElementById("cursorUI"),c=document.getElementById("cursorText"),e=document.getElementById("cursorImage"),A=new a.Vector2(window.innerWidth,window.innerHeight);function E(t){o.uniforms.iTime={value:t},o.uniforms.screenWidth={value:window.innerWidth},o.uniforms.screenHeight={value:window.innerHeight},o.uniforms.fieldOfView={value:H},o.uniforms.MAX_STEPS={value:100},o.uniforms.SURF_DIST={value:.001},o.uniforms.MAX_DIST={value:20},o.uniforms.absorption={value:2},o.uniforms.orbNumber={value:9}}function N(){const t=new Float32Array(4);switch(l.readRenderTargetPixels(d,f.x*A.x,f.y*A.y,1,1,t),Math.round(t[3]*10)){case 1:r=8;break;case 2:r=7;break;case 3:r=6;break;case 4:r=5;break;case 5:r=4;break;case 6:r=3;break;case 7:r=2;break;case 8:r=1;break;case 9:r=0;break;default:r=1e3;break}o.uniforms.read={value:r},y.uniforms.tDiffuse={value:d.texture}}function z(){l.clear(),l.setRenderTarget(d),l.clear(),l.render(k,w),l.setRenderTarget(null),l.render(P,w)}function L(){var t=t=document.getElementById("closeTab");t&&t.addEventListener("click",function(){B()})}function O(){switch(r){case 0:$("#pageMain").load("pages/page1.html");break;case 1:$("#pageMain").load("pages/page2.html");break;case 2:$("#pageMain").load("pages/page3.html");break;case 3:$("#pageMain").load("pages/page4.html");break;case 4:$("#pageMain").load("pages/page5.html");break;case 5:$("#pageMain").load("pages/page6.html");break;case 6:$("#pageMain").load("pages/page7.html");break;case 7:$("#pageMain").load("pages/page8.html");break;case 8:$("#pageMain").load("pages/page9.html");break}}function B(){var t=document.getElementById("pageMain");t.innerHTML="",m=!1}function X(){switch(r){case 0:c.innerText="About Me",e.style.width="120px",e.src="pages/images/page 1/1.png",e.style.borderWidth="5px";break;case 1:c.innerText="Artemis",e.style.width="150px",e.src="pages/images/page 2/1.png",e.style.borderWidth="5px";break;case 2:c.innerText="Ans",e.style.width="150px",e.src="pages/images/page 3/1.png",e.style.borderWidth="5px";break;case 3:c.innerText="Bounce Bomb Fury",e.style.width="150px",e.src="pages/images/page 4/1.png",e.style.borderWidth="5px";break;case 4:c.innerText="Burning Memory",e.style.width="200px",e.src="pages/images/page 5/1.jpg",e.style.borderWidth="5px";break;case 5:c.innerText="Under Our Wings",e.style.width="150px",e.src="pages/images/page 6/1.png",e.style.borderWidth="5px";break;case 6:c.innerText="Audio-Reactive TV",e.style.width="180px",e.src="pages/images/page 7/1.png",e.style.borderWidth="5px";break;case 7:c.innerText="Boozy Boa",e.style.width="200px",e.src="pages/images/page 8/1.png",e.style.borderWidth="5px";break;case 8:c.innerText="Shader Experiments",e.style.width="150px",e.src="pages/images/page 9/1.png",e.style.borderWidth="5px";break;default:c.innerText="",e.style.width="0px",e.src="",e.style.borderWidth="0px";break}}function V(t){requestAnimationFrame(V),T.update(t);const n=T.getElapsed();v=Date.now(),g=v-D,g>_&&(D=v-g%_,E(n),m?(r=1e3,o.uniforms.read={value:r},y.uniforms.tDiffuse={value:d.texture}):N(),L(),X(),z())}V();
