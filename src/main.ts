import { ACESFilmicToneMapping, EquirectangularReflectionMapping, PerspectiveCamera, Scene, WebGLRenderer, sRGBEncoding } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {clone} from "three/examples/jsm/utils/SkeletonUtils";
import * as THREE from "three";

let clock, mixer;
let renderer : WebGLRenderer, camera : PerspectiveCamera, scene : Scene;
let bones = [];
let allBones = [];
const animations = new THREE.AnimationObjectGroup(); 
let allJelly : THREE.Object3D[] = [];

init();
animate();

/**
 * Fonction principale
 */
function init() {
    const container = document.querySelector("#app");
    document.body.appendChild(container);
    camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.25, 200);
    camera.position.set(10, 10, 0);
    scene = new Scene();
    clock = new THREE.Clock();

    // generate jellyfish
    generateJellyFish(1, 1);

    // renderer
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = sRGBEncoding;
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 10;
    controls.maxDistance = 100;
    controls.target.set(0, 0, - 0.2);
    controls.update();
    window.addEventListener('resize', onWindowResize);
}

/**
 * Animation de la scene
 */
function animate() {

    
    if (allJelly.length !=0){
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0,4,4), Math.PI*0.0001);
        allJelly.forEach(element => {
            element.translateOnAxis(new THREE.Vector3(0, 1, 0), 0.01)
            element.applyQuaternion(quaternion);
        })

    }
    
    requestAnimationFrame(animate);
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

/**
 * Permet de créer des méduses
 * @param nb nombre de méduse à créer
 * @param position espacement des meduses
 */
function generateJellyFish(nb : number, position : number){
    new THREE.TextureLoader()
        .setPath('/assets/background/')
        .load('Jelly_dark.jpg', (texture) => {

            texture.mapping = EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture;
            const loader = new GLTFLoader().setPath("/assets/models/");
            loader.load("Jellyfish_bell_bones7.glb", function (gltf) {
                
                const element = gltf.scene;
                allJelly.push(element);
                element.position.set(getRandomInt(position),getRandomInt(position),getRandomInt(position))
                scene.add(element)
                prepareAnimationJellyfish(element)
                
                // Boucle pour créer les clones
                for (let i = 0; i < nb-1 ; i++){
                    const test = clone(element)
                    test.position.set(getRandomInt(position),getRandomInt(position),getRandomInt(position))
                    scene.add(test)
                    animations.add(test)   
                    allJelly.push(test);
                    prepareAnimationJellyfish(test)
                }
                

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
 * Fonction pour éviter de déformer la scène
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Permet de générer un nombre aléatoire
 * @param max 
 * @returns 
 */
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

