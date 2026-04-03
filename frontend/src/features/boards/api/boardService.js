import api from "../../../shared/api/api";
/* Using native Fetch API service for handling function calls on frontend */

async function getAllBoards() {
	try {
		const response = await api.get('/api/boards/');
		console.log(response.status);
		return response.json();
	} catch (error) {
		console.error(`${error}`);
	}
}

async function getBoardById(id) {
	try {
		const response = await api.get(`/api/boards/${id}`);
		console.log(response.status);
		return response.json();
	} catch (error) {
		console.error(`${error}`);
	}
}

async function createBoard(data) {
	try {
		const response = await api.post('/api/boards/', data);
		console.log(response.status);
		return response.json();
	} catch (error) {
		console.error(`${error}`);
	}
}

async function updateBoard(id, data) {

	try {
		const response = await api.put(`/api/boards/${id}`, data);
		console.log(response.status);
		return response.json();
	} catch (error) {
		console.error(`${error}`);
	}
}

async function deleteBoard(id) {
	try {
		const response = await api.delete(`/api/boards/${id}`);
		console.log(response.status);
		return response.json();
	} catch (error) {
		console.error(`${error}`);
	}
}

export { getAllBoards, getBoardById, createBoard, updateBoard, deleteBoard };