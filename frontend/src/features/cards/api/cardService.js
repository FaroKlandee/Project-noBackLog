import api from '../../../shared/api/api';

async function getAllCards(listId) {
	try {

		return await api.get(`/api/cards?listId=${listId}`)
	} catch (error) {
		throw console.error(`${error}`);
 }
}


export { getAllCards };
