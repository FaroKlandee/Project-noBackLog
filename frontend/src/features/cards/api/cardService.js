import api from '../../../shared/api/api';

async function getAllCards(listId) {
	return await api.get(`/api/cards?listId=${listId}`);
}

async function createCard(data) {
	return await api.post(`/api/cards/`, data);
}

async function deleteCard(id) {
	return await api.delete(`/api/cards/${id}`);
}

export { getAllCards, createCard, deleteCard };
