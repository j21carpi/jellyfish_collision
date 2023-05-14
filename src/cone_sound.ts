import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer,EquirectangularReflectionMapping, sRGBEncoding } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

let clock, mixer;
let renderer : WebGLRenderer, camera : PerspectiveCamera, scene : Scene;

// Box visible
const visible : boolean = true;
var boxMap : THREE.BoxHelper = null;

// Aquarium
const aquarium : number = 40;
const distanceAquarium : number = 0; // Prevoir la collision si on veux paroi

// Jellyfish propreties
const numberJellyfish : number = 20;
const speedAverage : number = 20;
const directionModificationRate : number = 100;
const colorJellyfish : THREE.Color = new THREE.Color(0x5B48D9);
var material : THREE.MeshStandardMaterial = null;
var minimumLight = 0.1;
const color1 : THREE.Color = new THREE.Color(0x5B48D9);
const color2 : THREE.Color = new THREE.Color(0x5B48D9);
const color3 : THREE.Color = new THREE.Color(0x5B48D9);

//const color1 : THREE.Color = new THREE.Color(0x005C53);
//const color2 : THREE.Color = new THREE.Color(0xF8752A);
//const color3 : THREE.Color = new THREE.Color(0x590202);

// Liste des cones
var data : { cone : THREE.Object3D, speed : number, position : THREE.Vector3, direction : THREE.Vector3, isCollision : boolean, actualFrequency : number}[] = [];

// Music 
var audio = document.getElementById("audio") as HTMLAudioElement;
var analyser : AnalyserNode = null;
var dataArray : Uint8Array;
var averageLower : number = null;
var averageLowerM : number = null;
var averageHigher : number = null;
var averageHigherM : number = null;
var nombrePiste : number = 4;

init();
animate();

function init() {
    const container = document.querySelector("#app");
    document.body.appendChild(container);

    camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.25, 200);
    camera.position.set(40, 10, 0);

    scene = new Scene();
    clock = new THREE.Clock();

    new THREE.TextureLoader()
        .setPath('/assets/background/')
        .load('Jelly_dark2.jpg', (texture) => {
            texture.mapping = EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture;


            const loader = new GLTFLoader().setPath("/assets/models/");
            loader.load("Jellyfish_bell_bones7.glb", function (gltf) {

                //createAquarium();
                var geometry = new THREE.BoxGeometry(aquarium*2, aquarium*2, aquarium*2);
                var boxMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
                var cone = new THREE.Mesh(geometry, boxMaterial);
                cone.position.set(0, 0, 0);
                
                createAquarium(cone);

                for (let index = 0; index < numberJellyfish; index++) {
                    const cone = addCone(getRandomNumber(aquarium), getRandomNumber(aquarium), getRandomNumber(aquarium));
                    cone.geometry.computeBoundingBox();
                    data.push({
                        cone: cone,
                        speed: (10+getRandomInt(speedAverage))*0.0005,
                        position : new THREE.Vector3(cone.position.x,  cone.position.y,  cone.position.z),
                        direction : new THREE.Vector3( 0, 0, 0),
                        isCollision : false,
                        actualFrequency : getRandomInt(nombrePiste)
                    })
                }

                play('assets/musics/Music3.mp3');

                mixer = new THREE.AnimationMixer(gltf.scene);
                gltf.animations.forEach((clip) => {
                    mixer.clipAction(clip).play();
                });
            });
        });

    // renderer
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = sRGBEncoding;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    //controls.addEventListener('change', render); // use if there is no animation loop
    controls.minDistance = 0;
    controls.maxDistance = 100;
    controls.target.set(0, 0, -0.2);
    controls.update();

    window.addEventListener('resize', onWindowResize);
}

function play(url : string) {

    audio.src = url;
    audio.load();

    var context = new AudioContext();
    var src = context.createMediaElementSource(audio);
    analyser = context.createAnalyser();
    src.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 512;
    var bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    var delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    clock.getElapsedTime();

    if (!audio.paused){
        analyser.getByteFrequencyData(dataArray);
        var lowerArray = dataArray.slice(0, (dataArray.length / nombrePiste) - 1);
        var lowerMArray = dataArray.slice((dataArray.length / nombrePiste) - 1, (dataArray.length *2 / nombrePiste) - 1);
        var upperMArray = dataArray.slice((dataArray.length * 2 / nombrePiste) - 1, (dataArray.length * 3 / nombrePiste) - 1);
        var upperArray = dataArray.slice((dataArray.length * 2 / nombrePiste) - 1, dataArray.length - 1);

        averageLower = lowerArray.reduce((p, c) => p + c, 0) / lowerArray.length /100;
        averageLowerM = lowerMArray.reduce((p, c) => p + c, 0) / lowerMArray.length /100;
        averageHigherM = upperMArray.reduce((p, c) => p + c, 0) / upperMArray.length /50;
        averageHigher = upperArray.reduce((p, c) => p + c, 0) / upperArray.length /50 ;
    }

    data.forEach((object, i) => {

        // Movements aléatoires
        const quaternion = new THREE.Quaternion();
        if (!object.isCollision){
            switch (getRandomInt(directionModificationRate)){
                case 2 :  
                    object.direction = new THREE.Vector3(-(5+object.speed)^2,0,-(5+object.speed)^2);
                    break;
                case 4 : 
                    object.direction = new THREE.Vector3(-(5+object.speed)^2,0,(5+object.speed)^2);
                    break;
                case 6 : 
                    object.direction = new THREE.Vector3((5+object.speed)^2,0,-(5+object.speed)^2);
                    break;
                case 8:
                    object.direction = new THREE.Vector3(-(5+object.speed)^2,0,-(5+object.speed)^2);
                    break;
            }
        }

        // On garde le mouvement aléatoire et on l'applique
        object.cone.translateOnAxis(new THREE.Vector3(0, 1, 0), object.speed)
        quaternion.setFromAxisAngle(object.direction, Math.PI*0.00005);
        object.cone.applyQuaternion(quaternion);

        // Collision avec l'aquarium, but du jeu : faire revenir la meduse dans l'aquarium sans la bloquer
        if (isCollision(object)) {
            if (!object.isCollision){
                object.direction = new THREE.Vector3((object.speed*2000 + object.direction.x),0,(object.speed*2000 + object.direction.z));
                quaternion.setFromAxisAngle(object.direction, Math.PI*0.00005);
                object.cone.applyQuaternion(quaternion);
            }
            object.isCollision = true
        }

        if (!isCollision(object) && object.isCollision){
            object.isCollision = false
        }

        data.forEach((d2 , j) => {
            let distance = object.cone.position.distanceTo(d2.cone.position);
            if (distance <= 10 && i != j) {
                // Cas de collision
                d2.direction = new THREE.Vector3(-d2.direction.x,0,-d2.direction.z);
                quaternion.setFromAxisAngle(d2.direction, Math.PI*0.00005);
                d2.cone.applyQuaternion(quaternion);

                object.direction = new THREE.Vector3(-object.direction.x,0,-object.direction.x);
                quaternion.setFromAxisAngle(object.direction, Math.PI*0.00005);
                object.cone.applyQuaternion(quaternion);
            }
        });

        if (!audio.paused){
            switch (object.actualFrequency){
                case 0 :
                    material = new THREE.MeshStandardMaterial({ color: colorJellyfish, emissiveIntensity : minimumLight + averageHigher, emissive : colorJellyfish});
                    break;
                case 1 : 
                    material = new THREE.MeshStandardMaterial({ color: colorJellyfish, emissiveIntensity : minimumLight + averageLower, emissive : color1});
                    break;
                case 2 : 
                    material = new THREE.MeshStandardMaterial({ color: colorJellyfish, emissiveIntensity : minimumLight + averageLowerM, emissive : color2});
                    break;
                case 3 : 
                    material = new THREE.MeshStandardMaterial({ color: colorJellyfish, emissiveIntensity : minimumLight + averageHigherM, emissive : color3});
                    break;

            }
            ((object.cone as THREE.Mesh).material as THREE.MeshStandardMaterial) = material;
            ((object.cone as THREE.Mesh).material as THREE.MeshStandardMaterial).needsUpdate = true;
        }

    })  

    renderer.render(scene, camera);
}

function addCone (px, py, pz) {

    var geometry = new THREE.ConeGeometry(1, 2); //x,y,z
    material = new THREE.MeshStandardMaterial({ color: colorJellyfish, emissiveIntensity : minimumLight, emissive : colorJellyfish });
    var cone = new THREE.Mesh(geometry, material);
    
    cone.position.set(px, py, pz);
    cone.geometry.computeBoundingBox(); // null sinon
    scene.add(cone);
    return cone;
}


function createAquarium(cone : THREE.Object3D){
    if (visible){
        boxMap = new THREE.BoxHelper(cone, 0xffffff);
        scene.add(boxMap);
    }
}


function isCollision(object) : boolean {
    return object.cone.position.x > (aquarium + distanceAquarium) 
    || object.cone.position.x < (-aquarium + distanceAquarium) 
    || object.cone.position.y > (aquarium + distanceAquarium) 
    || object.cone.position.y < (-aquarium + distanceAquarium)            
    || object.cone.position.z > (aquarium + distanceAquarium) 
    || object.cone.position.z < (-aquarium + distanceAquarium);
}

/**
 * Permet de générer un nombre aléatoire
 * @param max 
 * @returns 
 */
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

  function getRandomNumber(max) {
    if (getRandomInt(2) == 1) return -Math.floor(Math.random() * max);
    return Math.floor(Math.random() * max)
    
  }