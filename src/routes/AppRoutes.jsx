import { Route, Routes } from "react-router-dom";
import Profile from "../Components/Profile/Profile";
import Dashboard from "../Components/Dashboard";
import Courses from "../Components/Courses/Courses";
import Enrolled from "../Components/Enrolled/Enrolled";
import Home from "../Components/Home/Home";
import AddnewCourse from "../Admin/pages/courses/new-course/AddnewCourse";
import AllCourses from "../Admin/pages/courses/AllCourses";
import Register from '../Authentication/Register'
import Allusers from "../Admin/pages/userManagement/Allusers";
import EditCourse from "../Admin/pages/courses/edit-course/EditCourse";
import Login from "../Authentication/Login";
import CourseDetails from "../Components/CourseDetails/CourseDetails";
import AllTests from "../Admin/pages/tests/AllTests";
import TestDetails from "../Admin/pages/tests/TestDetails";

const AppRoutes = () => {
  return (
    <Routes>
      {/* <Route path="/" index element={<Dashboard />} /> */}
      <Route index element={<Register />}></Route>
      <Route path="login" element={<Login />}></Route>
      <Route path="home" element={<Dashboard />}>
        <Route index element={<Home />}></Route>
        <Route path="profile" element={<Profile />}></Route>
        <Route path="courses" element={<Courses />} ></Route>
        <Route path="enrolled" element={<Enrolled />} ></Route>
        <Route path="courseDetails/:courseId" element={<CourseDetails />} />
      </Route>
      <Route path="/admin" element={<AllCourses />} />
      <Route path="/admin/courses/new" element={<AddnewCourse />} />
      <Route path="/admin/courses/edit" element={<EditCourse />} />
      <Route path="/admin/users" element={< Allusers />} />
      <Route path="/admin/tests" element={< AllTests />} />
      <Route path="/admin/tests/details" element={< TestDetails />} />
    </Routes>
  );
};

export default AppRoutes;
