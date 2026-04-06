import { useBoards } from "../hooks/useBoards";

export default function Boards() {
	const { boards, loading, error } = useBoards();

	console.log('boards', boards);
	console.log('loading', loading);
	console.log('error', error);

	return (
		< div >
			Boards
		</div>

	)
}
