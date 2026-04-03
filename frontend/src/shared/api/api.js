const BASE_URL = 'http://localhost:5000';
const TIMEOUT_MS = 5000;

async function request(method, path, data = null) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

	const options = {
		method,
		signal: controller.signal,
		headers: {
			'Content-Type': 'application/json',
		},
	};

	if (data) {
		options.body = JSON.stringify(data);
	}

	try {
		const response = await fetch(`${BASE_URL}${path}`, options);
		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
		}

		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error.name === 'AbortError') {
			throw new Error(`Request timed out after ${TIMEOUT_MS}ms`);
		}
		throw error;
	}
}

const api = {
	get: (path) => request('GET', path),
	post: (path, data) => request('POST', path, data),
	put: (path, data) => request('PUT', path, data),
	delete: (path) => request('DELETE', path),
};

export default api;