import { Routes, Route } from "react-router-dom";
import Hero from "./Hero";
import Department from "./Department";
import Team from "./Team";
import About from "./About";
import Contact from "./Contact";
import Recruitment from "./Recruitment";
import StaffCheckIn from "./interview/StaffCheckIn";
import JudgeDashboard from "./interview/JudgeDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/department" element={<Department />} />
      <Route path="/team" element={<Team />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/recruitment" element={<Recruitment />} />
      <Route path="/staff" element={<StaffCheckIn />} />
      <Route path="/judge" element={<JudgeDashboard />} />
    </Routes>
  );
}
