import {
	DEFAULT_COLOR,
	VIEWPORT,
	SPHERES,
	type Sphere,
	type Vector,
	DIFFUSE_REFLECTION_LIGHTS,
	MAX_DISTANCE,
	CAMERA_POSITION,
} from "../types";
import {
	addition,
	computeNormal,
	crossProduct,
	dotProduct,
	magnitude,
	subtract,
} from "./vector";

// see: https://gabrielgambetta.com/computer-graphics-from-scratch/01-common-concepts.html
export function translateToCenterCoordinates(
	width: number,
	height: number,
	x: number,
	y: number,
) {
	return {
		x1: width / 2 + x,
		y1: height / 2 - y,
	};
}
// a = <D,D>,b = 2<CO,D>,c = <CO,CO> - r^2,a*t^2+b*t+c=0 求解 t 二元一次方程求解
export function intersectRaySphere(
	origin: Vector,
	direction: Vector,
	sphere: Sphere,
): [number, number] {
	const oc: Vector = subtract(origin, sphere.center);
	const a: number = dotProduct(direction, direction); // a = <D,D>
	const b: number = 2 * dotProduct(oc, direction); // b = 2<CO,D>
	const c: number = dotProduct(oc, oc) - sphere.radius ** 2; // c = <CO,CO> - r^2
	const discriminant: number = b * b - 4 * a * c; // b^2 - 4*a*c
	const t1: number = (-b + Math.sqrt(discriminant)) / (2 * a);
	const t2: number = (-b - Math.sqrt(discriminant)) / (2 * a);
	return [t1, t2];
}

// 2D canvas coordinates to 3D viewport coordinates.
export function canvasToViewport(
	x: number,
	y: number,
	canvas: HTMLCanvasElement,
): Vector {
	return {
		x: (x * VIEWPORT.WIDTH) / canvas.width,
		y: (y * VIEWPORT.HEIGHT) / canvas.height,
		z: VIEWPORT.DISTANCE,
	};
}

// P=O+t(V−O) min<t<max
export function traceRay(
	origin: Vector,
	direction: Vector,
	minT: number,
	maxT: number,
) {
	let closestT = MAX_DISTANCE;
	let closestSphere: Sphere | null = null;
	for (const sphere of SPHERES) {
		const ts = intersectRaySphere(origin, direction, sphere);
		// 找符合t>1距离最近的点
		for (const t of ts) {
			if (t < closestT && t > minT && t < maxT) {
				closestT = t;
				closestSphere = sphere;
			}
		}
	}
	if (closestSphere) {
		// O + closest_t * (V-O) // Compute intersection
		const P = addition(
			origin,
			crossProduct(subtract(direction, origin), closestT),
		);
		const N = computeNormal(P, closestSphere?.center);
		const V = subtract(crossProduct(direction, -1), CAMERA_POSITION); // why use crossProduct(direction, -1) ? see Figure 3-15
		const index = computeLighting(N, P, V, closestSphere.specular);
		return closestSphere.color.map((item) => item * index) as Sphere["color"];
	}
	return DEFAULT_COLOR;
}

export function computeLighting(N: Vector, P: Vector, V: Vector, S: number) {
	let i = 0;
	let L: Vector;
	let NL: number;
	let R: Vector;
	let RV: number;
	for (const diffuseLight of DIFFUSE_REFLECTION_LIGHTS) {
		switch (diffuseLight.type) {
			case "ambient":
				i += diffuseLight.intensity;
				continue;
			case "point":
				L = subtract(diffuseLight.position, P);
				break;
			case "directional":
				L = diffuseLight.position;
				break;
		}
		// diffuse
		NL = dotProduct(N, L);
		if (NL > 0) {
			i += (diffuseLight.intensity * NL) / (magnitude(N) * magnitude(L));
		}
		//specular
		if (S > 0) {
			R = subtract(crossProduct(N, 2 * NL), L);
			RV = dotProduct(R, V);
			if (RV > 0) {
				i += diffuseLight.intensity * (RV / (magnitude(R) * magnitude(V))) ** S;
			}
		}
	}
	return i;
}
