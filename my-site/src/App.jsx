import { Routes, Route } from "react-router-dom";
import Hero from "./Hero";
import Department from "./Department";
import Team from "./Team";
import About from "./About";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/department" element={<Department />} />
      <Route path="/team" element={<Team />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}
