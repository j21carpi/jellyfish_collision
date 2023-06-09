import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer,EquirectangularReflectionMapping, sRGBEncoding } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {clone} from "three/examples/jsm/utils/SkeletonUtils";
import * as THREE from "three";

let clock, mixer;
let renderer : WebGLRenderer, camera : PerspectiveCamera, scene : Scene;

// Box visible
const visible : boolean = true;
var boxMap : THREE.BoxHelper = null;

// Aquarium
var aquarium : number = 20;
var distanceAquarium : number = 0;
/*
var aquariumsObject : { object : THREE.Object3D, position : THREE.Vector3, isCollision : boolean}[] = 
[
    {
        object : null,
        position : new THREE.Vector3(aquarium*2, 0, 0),
        isCollision : false

    },
    {
        object : null,
        position : new THREE.Vector3(-aquarium*2, 0, 0),
        isCollision : false
    },
    {
        object : null,
        position : new THREE.Vector3(0, aquarium*2, 0),
        isCollision : false
    },
    {
        object : null,
        position : new THREE.Vector3(0, -aquarium*2, 0),
        isCollision : false
    },
    {
        object : null,
        position : new THREE.Vector3(0, 0, aquarium*2),
        isCollision : false
    },
    {
        object : null,
        position : new THREE.Vector3(0, 0, -aquarium*2),
        isCollision : false
    },]
    */

// Jellyfish propreties
var numberJellyfish : number = 50;
var speedAverage : number = 20;
var directionModificationRate : number = 100;

// Liste des cones
var data : { cone : THREE.Object3D, speed : number, position : THREE.Vector3, direction : THREE.Vector3, isCollision : boolean}[] = [];

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
        .load('Jelly_dark.jpg', (texture) => {
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
                
                if (visible){
                    boxMap = new THREE.BoxHelper(cone, 0xffffff);
                    scene.add(boxMap);
                }

                for (let index = 0; index < numberJellyfish; index++) {
                    const cone = addCone(getRandomNumber(aquarium), getRandomNumber(aquarium), getRandomNumber(aquarium));
                    cone.geometry.computeBoundingBox();
                    data.push({
                        cone: cone,
                        speed: (10+getRandomInt(speedAverage))*0.0005,
                        position : new THREE.Vector3(cone.position.x,  cone.position.y,  cone.position.z),
                        direction : new THREE.Vector3( 0, 0, 0),
                        isCollision : false
                    })
                }
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

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    var delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    let t = clock.getElapsedTime();

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
                object.direction = new THREE.Vector3(-(object.speed*2000 + object.direction.x),0,-(object.speed*2000 + object.direction.y));
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
    })

    renderer.render(scene, camera);
}

function addCone (px, py, pz) {

    var color = new THREE.Color(0x00000);
    var geometry = new THREE.ConeGeometry(1, 2); //x,y,z
    var boxMaterial = new THREE.MeshBasicMaterial({ color: color });
    var cone = new THREE.Mesh(geometry, boxMaterial);
    cone.position.set(px, py, pz);
    cone.geometry.computeBoundingBox(); // null sinon
    scene.add(cone);
    return cone;
}

/*
function createAquarium(){

    var geometry = new THREE.BoxGeometry(aquarium*2, aquarium*2, aquarium*2);
    var boxMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    var cone = new THREE.Mesh(geometry, boxMaterial);
    var coneClone = clone(cone) as THREE.Mesh;
    cone.position.set(0, 0, 0);
    if (visible){
        boxMap = new THREE.BoxHelper(coneClone, 0xffffff);
        scene.add(boxMap);
    }

    aquariumsObject.forEach((element) => {
        coneClone.position.set(element.position.x, element.position.y, element.position.z);
        coneClone.geometry.computeBoundingBox();
        element.object = coneClone as THREE.Object3D;
        if (visible){
            boxMap = new THREE.BoxHelper(coneClone, 0xffffff);
            scene.add(boxMap);
        }
    })    
}
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

  function getRandomNumber(max) {
    if (getRandomInt(2) == 1) return -Math.floor(Math.random() * max);
    return Math.floor(Math.random() * max)
    
  }