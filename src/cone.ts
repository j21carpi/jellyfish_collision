import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer,EquirectangularReflectionMapping, sRGBEncoding } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

let clock, mixer;
let renderer : WebGLRenderer, camera : PerspectiveCamera, scene : Scene;

var aquarium : number = 10;
var speedAverage : number = 100;

var data = [];

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
                const squid = gltf.scene;


                var geometry = new THREE.BoxGeometry(aquarium*2, aquarium*2, aquarium*2);
                var boxMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
                var cone = new THREE.Mesh(geometry, boxMaterial);

                cone.position.set(0, 0, 0);
                cone.geometry.computeBoundingBox(); // null sinon
                const boxMap = new THREE.BoxHelper(cone, 0xffffff);
                scene.add(boxMap);


                for (let index = 0; index < 2; index++) {
                    const c = addCone(getRandomInt(aquarium), getRandomInt(aquarium), getRandomInt(aquarium));

                    data.push({
                        cone: c,
                        speed: getRandomInt(speedAverage)*0.00005,
                        sensx: getRandomInt(aquarium),
                        sensz: getRandomInt(aquarium),
                        sensy: getRandomInt(aquarium)
                    })
                    c.geometry.computeBoundingBox();
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
    controls.target.set(0, 0, - 0.2);
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

    data.forEach((d, i) => {
        if (d.cone.position.x > aquarium) {
            d.sensx = d.sensx * -1;
        }
        if (d.cone.position.x < -aquarium) {
            d.sensx = d.sensx * -1;
        }
        if (d.cone.position.z > aquarium) {
            d.sensz = d.sensz * -1;
        }
        if (d.cone.position.z < -aquarium) {
            d.sensz = d.sensz * -1;
        }
        if (d.cone.position.y > aquarium) {
            d.sensy = d.sensy * -1;
        }
        if (d.cone.position.y < -aquarium) {
            d.sensy = d.sensy * -1;
        }

        d.cone.position.x += d.speed * d.sensx;
        d.cone.position.z += d.speed * d.sensz;
        d.cone.position.y += d.speed * d.sensy;

        data.forEach((d2, j) => {
            let distance = d.cone.position.distanceTo(d2.cone.position);
            let angle = d.cone.position.angleTo(d2.cone.position);

            const quaternion = new THREE.Quaternion();
            quaternion.setFromAxisAngle(new THREE.Vector3(d.cone.position.x,d.cone.position.y,d.cone.position.z), Math.PI*0.00005);
            d.cone.applyQuaternion(quaternion);

            if (distance <= 2 && i != j) {
                // Cas de collision
                d2.sensx = d2.sensx * -1;
                d2.sensz = d2.sensz * -1;
                d2.sensy = d2.sensy * -1;
                d.sensx = d.sensx * -1;
                d.sensz = d.sensz * -1;
                d.sensy = d.sensy * -1;
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

/**
 * Permet de générer un nombre aléatoire
 * @param max 
 * @returns 
 */
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }