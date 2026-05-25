import api from '../../../shared/api/api';

async function getAllCards(listId) {
	try {

		return await api.get(`/api/cards?listId=${listId}`)
	} catch (error) {
		throw console.error(`${error}`);
 }
}

async function createCard(data) {
	try {
		return await api.post(`/api/cards/`, data)
	} catch (error) {
		throw error;
	}
}

async function deleteCard(id) {
	try {
		return await api.delete(`/api/cards/${id}`)
	} catch (error) {
		throw error;
	}
}

export { getAllCards, createCard, deleteCard };
