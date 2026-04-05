import { useEffect, useState } from 'react';
import { getAllBoards } from '../api/boardService';

export function useBoards() {
	const [boards, setBoards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchBoards = async () => {
			const data = await getAllBoards();
			setBoards(data);
		};

		fetchBoards()
			.catch(err => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	return { boards, loading, error };
}