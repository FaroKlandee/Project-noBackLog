import api from '../../../shared/api/api';

async function getAllBoards() {
	try {
		return await api.get('/api/boards/');
	} catch (error) {
		console.error(`${error}`);
	}
}

async function getBoardById(id) {
	try {
		return await api.get(`/api/boards/${id}`);
	} catch (error) {
		console.error(`${error}`);
	}
}

async function createBoard(data) {
	try {
		return await api.post('/api/boards/', data);
	} catch (error) {
		console.error(`${error}`);
	}
}

async function updateBoard(id, data) {
	try {
		return await api.put(`/api/boards/${id}`, data);
	} catch (error) {
		console.error(`${error}`);
	}
}

async function deleteBoard(id) {
	try {
		return await api.delete(`/api/boards/${id}`);
	} catch (error) {
		console.error(`${error}`);
	}
}

export { getAllBoards, getBoardById, createBoard, updateBoard, deleteBoard };