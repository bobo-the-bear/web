import { renderToString } from "react-dom/server";
import Dashboard from "./dashboard";
export function render() { return renderToString(<Dashboard/>); }
