import vertShaderSrc from './vert.js';
import fragShaderSrc from './frag.js';
import WebGPU from './lib/webgpu.js';
import {
    createIdentityMat4,
    createLookAtMat4,
    createOrthographicMat4,
    createPerspectiveMat4,
    createRotationZMat4,
    createTranslationMat4,
    multiplyMat4,
} from './lib/utils.js';

class Scene {
    constructor(gpu) {
        this.animationFactor = 0;
        this.usePerspective = false;

        this.program = gpu.createProgram(vertShaderSrc, fragShaderSrc, {
            cullMode: 'none',
        });

        this.kiteShape = gpu.createShape(this.createKite(), 6);
        this.tailShape = gpu.createShape(this.createTail(), 6);

        this.kiteUniform = gpu.createUniform(this.program, createIdentityMat4());
        this.tailUniform = gpu.createUniform(this.program, createIdentityMat4());
    }

    createKite() {
        const vertices = [
            [0.0, 0.0, 0.0, 1.0], // final da pipa
            [-0.15, 0.3, 0.0, 1.0], // esquerda
            [0.0, 0.5, 0.0, 1.0], // topo da pipa

            [0.15, 0.3, 0.0, 1.0], // direita
        ];

        const faceColors = [
            [1.0, 0.725, 0.804, 1.0],
            [1.0, 0.847, 0.302, 1.0],
        ];

        const positions = [
            ...vertices[0], ...vertices[1], ...vertices[2],
            ...vertices[0], ...vertices[2], ...vertices[3],
        ];

        const colors = [
            ...faceColors[0], ...faceColors[0], ...faceColors[0],
            ...faceColors[1], ...faceColors[1], ...faceColors[1],
        ];

        return [positions, colors];
    }

    createTail() {
        const vertices = [
            [-0.035, -0.24, 0.0, 1.0], // esquerda
            [0.035, -0.24, 0.0, 1.0], // direita
            [0.0, -0.12, 0.0, 1.0], // topo

            [-0.035, -0.12, 0.0, 1.0], // esquerda
            [0.035, -0.12, 0.0, 1.0], // direita
            [0.0, 0.0, 0.0, 1.0], // final da pipa
        ];

        const faceColors = [
            [0.68, 0.55, 0.9, 1.0],
        ];

        const positions = [
            ...vertices[0], ...vertices[1], ...vertices[2],
            ...vertices[3], ...vertices[4], ...vertices[5],
        ];

        const colors = [
            ...faceColors[0], ...faceColors[0], ...faceColors[0],
            ...faceColors[0], ...faceColors[0], ...faceColors[0],
        ];

        return [positions, colors];
    }

    createKiteModelMatrix() {
        this.animationFactor += 0.02;
        
        const rotateZ = createRotationZMat4(0.18 * Math.sin(this.animationFactor + 1.0));

        const translate = createTranslationMat4(0, -0.1 + 0.5 * Math.sin(this.animationFactor), 0);

        let model = multiplyMat4(rotateZ, translate);

        return model;
    }

    createTailModelMatrix(kiteModel) {
        const rotation = createRotationZMat4(0.30 * Math.sin(this.animationFactor - 1.0));

        let model = multiplyMat4(kiteModel, rotation);

        return model;
    }

    createViewMatrix() {
        const eye = [0, 0.3 * (-0.1 + 0.5 * Math.sin(this.animationFactor)), 1];
        const at = [0, 0.3 * (-0.1 + 0.5 * Math.sin(this.animationFactor)), 0];
        const up = [0, 1, 0];

        return createLookAtMat4(eye, at, up, true);
    }


    createProjectionMatrix() {
        const aspect = 1024 / 768;

        if (this.usePerspective) {
            return createPerspectiveMat4(Math.PI / 3, aspect, 0.1, 10);
        }

        return createOrthographicMat4(-1.5 * aspect, 1.5 * aspect, -1.5, 1.5, 0.1, 10);
    }

    draw(gpu) {
        const kiteModel = this.createKiteModelMatrix();
        const view = this.createViewMatrix();
        const projection = this.createProjectionMatrix();

        const kiteModelView = multiplyMat4(view, kiteModel);
        this.kiteUniform.data.set(multiplyMat4(projection, kiteModelView));
        gpu.writeBuffer(this.kiteUniform.buffer, this.kiteUniform.data);
        gpu.draw(this.program, this.kiteShape, [this.kiteUniform.bindGroup]);
        

        const tailModel = this.createTailModelMatrix(kiteModel);

        const tailModelView = multiplyMat4(view, tailModel);
        this.tailUniform.data.set(multiplyMat4(projection, tailModelView));
        gpu.writeBuffer(this.tailUniform.buffer, this.tailUniform.data);
        gpu.draw(this.program, this.tailShape, [this.tailUniform.bindGroup]);
    }
}

class Main {
    async init() {
        this.gpu = await WebGPU.createCanvas('#glcanvas', 1024, 768);
        this.scene = new Scene(this.gpu);
    }

    draw() {
        this.gpu.start();
        this.scene.draw(this.gpu);
        this.gpu.finish();
        requestAnimationFrame(this.draw.bind(this));
    }
}

try {
    const app = new Main();
    await app.init();
    app.draw();
} catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML('beforeend', `<p>${error.message}</p>`);
}
