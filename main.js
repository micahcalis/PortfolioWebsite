import * as THREE from 'three/build/three.module.js';
import { RayMarch } from './RayMarch.js';
import { FullscreenUnlit } from './FullscreenUnlit.js';
import { Timer } from 'three/addons/misc/Timer.js';
import Stats from 'stats.js'

// set scenes and camera
const fov = 75;
let scene = new THREE.Scene();
let scene2 = new THREE.Scene();
const camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );

// set renderer
const renderer = new THREE.WebGLRenderer(); 
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.autoClear = false;
document.body.appendChild( renderer.domElement );

// set rendertarget
const renderTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { 
	format: THREE.RGBAFormat, type: THREE.FloatType });

// quad for first render
const materialScreen = new THREE.ShaderMaterial({
	uniforms: { "tDiffuse" : { value: renderTarget.texture } },
	vertexShader: RayMarch.vertexShader,
	fragmentShader: RayMarch.fragmentShader,
	depthWrite: false,
});
const quad = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 1, 1 ), materialScreen );
scene.add( quad );

// quad for second render
const materialUnlit = new THREE.ShaderMaterial({
	uniforms: { "tDiffuse" : { value: renderTarget.texture } },
	vertexShader: FullscreenUnlit.vertexShader,
	fragmentShader: FullscreenUnlit.fragmentShader,
	depthWrite: false,
});
const quad2 = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2, 1, 1 ), materialUnlit );
scene2.add( quad2 );

// timer
const timer = new Timer();

// mouse move event 
const mouse = new THREE.Vector2();
const divMouse = new THREE.Vector2();
document.addEventListener("mousemove", function(e) {
	mouse.x = (e.clientX / window.innerWidth);
	mouse.y = 1 - (e.clientY / window.innerHeight);
	divMouse.x = e.pageX;
	divMouse.y = e.pageY;
	cursorUI.style.left = divMouse.x + "px";
	cursorUI.style.top = divMouse.y + "px";
});

// mouse click event
document.addEventListener("click", function(e) {
	if (!pageOpen && readInt < 999)
	{
		openPage();
		pageOpen = true;
	}
})

// on resize
addEventListener("resize",() => {
    console.log("resize");
    renderer.setSize(window.innerWidth, window.innerHeight);
},false);

// stats
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

// framerate
var fps = 60;
var now;
var then = Date.now();
var interval = 1000/fps;
var delta;

// variables
let readInt;
let pageOpen = false;
const cursorUI = document.getElementById("cursorUI");
const cursorText = document.getElementById("cursorText");
const cursorImage = document.getElementById("cursorImage");
const res = new THREE.Vector2(window.innerWidth, window.innerHeight);


function setMaterial( t )
{
	materialScreen.uniforms.iTime = {value: t} ; 
	materialScreen.uniforms.screenWidth = {value: window.innerWidth} ; 
	materialScreen.uniforms.screenHeight = {value: window.innerHeight} ; 
	materialScreen.uniforms.fieldOfView = {value: fov} ;
	materialScreen.uniforms.MAX_STEPS = {value: 100} ;
	materialScreen.uniforms.SURF_DIST = {value: 0.001} ;
	materialScreen.uniforms.MAX_DIST = {value: 20.0} ;
	materialScreen.uniforms.absorption = {value: 2.0} ;
	materialScreen.uniforms.orbNumber = {value: 9} ;
}

function readPixels()
{
	const pixelCol = new Float32Array(4);
	renderer.readRenderTargetPixels(renderTarget, mouse.x * res.x, mouse.y * res.y, 1, 1, pixelCol);
	const alphaVal = Math.round(pixelCol[3] * 10);
	switch (alphaVal)
	{
		case 1:
			readInt = 8;
			break;
		case 2:
			readInt = 7;
			break;
		case 3:
			readInt = 6;
			break;
		case 4:
			readInt = 5;
			break;
		case 5:
			readInt = 4;
			break;
		case 6:
			readInt = 3;
			break;
		case 7:
			readInt = 2;
			break;
		case 8:
			readInt = 1;
			break;
		case 9:
			readInt = 0;
			break;
		default:
			readInt = 1000;
			break;
	}
	// set quad2 and pass info from mouse pos to gpu
    materialScreen.uniforms.read = {value: readInt} ;
	materialUnlit.uniforms.tDiffuse = {value: renderTarget.texture };
}

function renderPipeline()
{
	// clear renderer before operations
	renderer.clear();

	// render first scene into the rendertarget (for the pixel read)
	renderer.setRenderTarget(renderTarget);
	renderer.clear();
	renderer.render(scene, camera);

	// render second scene with full screen quad w/ rendertarget as texture (for output)
	renderer.setRenderTarget(null);
	renderer.render(scene2, camera);	
}

function exitButton()
{
	var closeButton = closeButton = document.getElementById("closeTab");
	if (closeButton)
	{
		closeButton.addEventListener("click", function() {
			closePage();
		});
	}
}

function openPage()
{
	switch (readInt)
	// inject html from correct page into the index.html
	{
		case 0:
			$("#pageMain").load("pages/page1.html");
			break;
		case 1:
			$("#pageMain").load("pages/page2.html");
			break;
		case 2:
			$("#pageMain").load("pages/page3.html");
			break;
		case 3:
			$("#pageMain").load("pages/page4.html");
			break;
		case 4:
			$("#pageMain").load("pages/page5.html");
			break;
		case 5:
			$("#pageMain").load("pages/page6.html");
			break;
		case 6:
			$("#pageMain").load("pages/page7.html");
			break;
		case 7:
			$("#pageMain").load("pages/page8.html");
			break;
		case 8:
			$("#pageMain").load("pages/page9.html");
			break;
	}
}

function closePage()
{
	// clear the subpage from main page
	var inner = document.getElementById("pageMain");
	inner.innerHTML = "";
	// set variables
	pageOpen = false;
}

function handleCursor()
{
	switch (readInt)
	{
		case 0:
			cursorText.innerText = "About Me";
			cursorImage.style.width = "120px";
			cursorImage.src = "pages/images/page 1/1.png";
			cursorImage.style.borderWidth = "5px";
			break;
		case 1:
			cursorText.innerText = "Artemis";
			cursorImage.style.width = "150px";
			cursorImage.src = "pages/images/page 2/1.png";
			cursorImage.style.borderWidth = "5px";
			break;
		case 2:
			cursorText.innerText = "Ans";
			cursorImage.style.width = "150px";
			cursorImage.src = "pages/images/page 3/1.png";
			cursorImage.style.borderWidth = "5px";
			break;
		case 3:
			cursorText.innerText = "Bounce Bomb Fury";
			cursorImage.style.width = "150px";
			cursorImage.src = "pages/images/page 4/1.png";
			cursorImage.style.borderWidth = "5px";
			break;
		case 4:
			cursorText.innerText = "Burning Memory";
			cursorImage.style.width = "200px";
			cursorImage.src = "pages/images/page 5/1.jpg";
			cursorImage.style.borderWidth = "5px";
			break;
		case 5:
			cursorText.innerText = "Under Our Wings";
			cursorImage.style.width = "150px";
			cursorImage.src = "pages/images/page 6/1.png";
			cursorImage.style.borderWidth = "5px";
			break;
		case 6:
			cursorText.innerText = "Audio-Reactive TV";
			cursorImage.style.width = "180px";
			cursorImage.src = "pages/images/page 7/1.png";
			cursorImage.style.borderWidth = "5px";
			break;
		case 7:
			cursorText.innerText = "Boozy Boa";
			cursorImage.style.width = "200px";
			cursorImage.src = "pages/images/page 8/1.png";
			cursorImage.style.borderWidth = "5px";
			break;
		case 8:
			cursorText.innerText = "Shader Experiments";
			cursorImage.style.width = "150px";
			cursorImage.src = "pages/images/page 9/1.png";
			cursorImage.style.borderWidth = "5px";
			break;
		default:
			cursorText.innerText = "";
			cursorImage.style.width = "0px";
			cursorImage.src = "";
			cursorImage.style.borderWidth = "0px";
			break;
	}
}

function animate( timestamp ) {

	// do the update thing
	requestAnimationFrame( animate );

	// time
	timer.update( timestamp );
	const t = timer.getElapsed();

	// frame limiter
	now = Date.now();
    delta = now - then;
    
	// execute code at 'fps' frames per second
    if (delta > interval) {      
		stats.begin()  
        then = now - (delta % interval);
         
		setMaterial( t );

		if (!pageOpen)
		{
			readPixels();
		}
		else
		{
			readInt = 1000;
			// set quad2 and pass info from mouse pos to gpu
			materialScreen.uniforms.read = {value: readInt} ;
			materialUnlit.uniforms.tDiffuse = {value: renderTarget.texture };
		}

		exitButton();

		handleCursor();
		console.log(mouse);
		// renderTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { 
		// 	format: THREE.RGBAFormat, type: THREE.FloatType });
		// renderTarget.width = window.innerWidth;
		// renderTarget.height = window.innerHeight;
	
		renderPipeline();
		stats.end()
    }
}

animate();