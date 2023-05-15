import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer,EquirectangularReflectionMapping, sRGBEncoding } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {clone} from "three/examples/jsm/utils/SkeletonUtils";
import * as THREE from "three";

let clock, mixer;
let renderer : WebGLRenderer, camera : PerspectiveCamera, scene : Scene;
let allBones = [];
const animations = new THREE.AnimationObjectGroup(); 

// Box visible
const visible : boolean = false;
var boxMap : THREE.BoxHelper = null;

// Aquarium
const aquarium : number = 40;
const distanceAquarium : number = 0; // Prevoir la collision si on veux paroi

// Jellyfish propreties
const numberJellyfish : number = 40;
const speedAverage : number = 20;
const directionModificationRate : number = 100;
const colorJellyfish : THREE.Color = new THREE.Color(0x5B48D9);
var material : THREE.MeshStandardMaterial = null;
var minimumLight = 1;
const color1 : THREE.Color = new THREE.Color(0x5B48D9);
const color2 : THREE.Color = new THREE.Color(0x5B48D9);
const color3 : THREE.Color = new THREE.Color(0x5B48D9);
let bones = [];
let allJelly : THREE.Object3D[] = [];
var generalMaterial : THREE.MeshStandardMaterial = null;

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
            generateJellyFish(numberJellyfish);

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

        averageLower = lowerArray.reduce((p, c) => p + c, 0) / lowerArray.length/2;
        averageLowerM = lowerMArray.reduce((p, c) => p + c, 0) / lowerMArray.length/2;
        averageHigherM = upperMArray.reduce((p, c) => p + c, 0) / upperMArray.length/2;
        averageHigher = upperArray.reduce((p, c) => p + c, 0) / upperArray.length/2;
    }

    //TODO
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
        object.cone.translateOnAxis(new THREE.Vector3(0, 1, 0), object.speed) //TODO
        quaternion.setFromAxisAngle(object.direction, Math.PI*0.00005);
        object.cone.applyQuaternion(quaternion); //TODO

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
            let distance = object.cone.position.distanceTo(d2.cone.position); //TODO
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

        material = generalMaterial.clone();

        if (!audio.paused){
            
            switch (object.actualFrequency){
                case 0 :
                    material.emissiveIntensity = minimumLight + averageHigher;
                   break;
                case 1 : 
                    material.emissiveIntensity = minimumLight + averageLower;
                    break;
                case 2 : 
                    material.emissiveIntensity = minimumLight + averageLowerM;
                    break;
                case 3 : 
                    material.emissiveIntensity = minimumLight + averageHigherM;
                    break;
            }

            ((object.cone.children[10].children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial) = material;
            ((object.cone.children[10].children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).needsUpdate = true;
        }

    })  


    if (allJelly.length !=0){
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0,4,4), Math.PI*0.0001);
        allJelly.forEach(element => {
            element.translateOnAxis(new THREE.Vector3(0, 1, 0), 0.01)
            element.applyQuaternion(quaternion);
        })

    }
    
    var delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    let t = clock.getElapsedTime();
    allBones.forEach((childrenBones => {
        childrenBones.forEach(bone => {
            bone.forEach((b,i) => {
                b.position.z += move(t,i,childrenBones)
            })
        })
    }))

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


/**
 * Permet de créer des méduses
 * @param nb nombre de méduse à créer
 * @param position espacement des meduses
 */
function generateJellyFish(nb : number){
    new THREE.TextureLoader()
        .setPath('/assets/background/')
        .load('Jelly_dark2.jpg', (texture) => {
            texture.mapping = EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture;
            const loader = new GLTFLoader().setPath("/assets/models/");
            loader.load("Jellyfish_bell_bones10.glb", function (gltf) {
                
                //createAquarium();
                var geometry = new THREE.BoxGeometry(aquarium*2, aquarium*2, aquarium*2);
                var boxMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
                var cube = new THREE.Mesh(geometry, boxMaterial);
                cube.position.set(0, 0, 0);
                createAquarium(cube);


                const element = gltf.scene;

                allJelly.push(element);
                element.position.set(getRandomNumber(aquarium),getRandomNumber(aquarium),getRandomNumber(aquarium))
                scene.add(element)
                prepareAnimationJellyfish(element)

                generalMaterial = (element.children[10].children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
                
                // Boucle pour créer les clones
                for (let i = 0; i < nb-1 ; i++){
                    const cone = clone(element)
                    cone.position.set(getRandomNumber(aquarium),getRandomNumber(aquarium),getRandomNumber(aquarium))
                    scene.add(cone)
                    animations.add(cone)   
                    allJelly.push(cone);
                    prepareAnimationJellyfish(cone)

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

                // Ajout de l'animation de la cloche... Passé tant de temps sur ça...
                animations.add(element)
                mixer = new THREE.AnimationMixer(animations);
                const clip = THREE.AnimationClip.findByName(gltf.animations, "ArmatureAction");
                const action = mixer.clipAction(clip);
                action.play();
            });
        });
}

/**
 * Fonction permettant de faire bouger les tentacules d'une meduse
 * @param jelly 
 */
function prepareAnimationJellyfish(jelly) {
    for (let index = 0; index < 8; index++) {
        if (index == 0) var object = jelly.getObjectByName("Bone004", true);
        else var object = jelly.getObjectByName("Bone004_" + index);
        let tmp = []
        tmp.push(object)
        object = object.children;
        while (!(object === undefined || object.length == 0)) {
            tmp.push(object[0]);
            object = object[0].children;
        }
        bones.push(tmp)
    }
    allBones.push(bones)
    bones = []
}

/**
 * Fonction permettant de faire bouger une tentacule donnée
 * @param x 
 * @param boneIndex 
 * @param childrenBones 
 * @returns 
 */
function move(x, boneIndex, childrenBones) {
    const amplitude = -.0015;
    const period = 4;
    const phaseOffset = Math.PI / childrenBones[0].length * 2;
    const phase = boneIndex * phaseOffset;
    return amplitude * Math.sin(2 * Math.PI * (x / period) + phase);
}

/**
 * Fonction pour lancer la musique
 * @param url 
 */
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

/**
 * Renvoie True si collision avec les parois de l'aquarium
 * @param object 
 * @returns 
 */
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

  /**
   * Permet de générer un nombre aléatoire sur R
   * @param max 
   * @returns 
   */
function getRandomNumber(max) {
    if (getRandomInt(2) == 1) return -Math.floor(Math.random() * max);
    return Math.floor(Math.random() * max)
    
}

/**
 * Permet de faire apparaitre l'aquarium
 * @param cone 
 */
function createAquarium(cone : THREE.Object3D){
    if (visible){
        boxMap = new THREE.BoxHelper(cone, 0xffffff);
        scene.add(boxMap);
    }
}

/**
 * Pour ne pas deformer la scene
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}