import api from '../../../shared/api/api';

async function getAllBoards() {
	try {
		const response = await api.get('/api/boards/');
		return response.data;
	} catch (error) {
		console.error(`${error}`);
	}
}

async function getBoardById(id) {
	try {
		const response = await api.get(`/api/boards/${id}`);
return response.data;

	} catch (error) {
		console.error(`${error}`);
	}
}

async function createBoard(data) {
	try {
		const response = await api.post('/api/boards/', data);
return response.data;

	} catch (error) {
		console.error(`${error}`);
	}
}

async function updateBoard(id, data) {
	try {
		const response = await api.put(`/api/boards/${id}`, data);
return response.data;

	} catch (error) {
		console.error(`${error}`);
	}
}

async function deleteBoard(id) {
	try {
		const response = await api.delete(`/api/boards/${id}`);
return response.message;
	} catch (error) {
		console.error(`${error}`);
	}
}

export { getAllBoards, getBoardById, createBoard, updateBoard, deleteBoard };
