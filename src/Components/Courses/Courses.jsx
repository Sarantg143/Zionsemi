import React, { useState, useEffect } from "react";
import "./Courses.css";
import { useNavigate } from "react-router-dom";
import imgd from "../Assets/Images/imagenotxt2.png";
import LoadingPage from "../LoadingPage/LoadingPage";
import ErrorDataFetchOverlay from "../Error/ErrorDataFetchOverlay";
import { getAllDegrees } from "../../Admin/firebase/degreeApi";

const Courses = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [allLessons, setAllLessons] = useState([]);
  const [coursesData, setCoursesData] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem("userdata"));
        if (userInfo) {
          const res = await getAllDegrees(); // Fetching data from Firestore
          res.forEach(degree => {
            if (degree.id === userInfo.applyingFor) {
              const degree_courses = {};
              const allchapters = [];
              degree.courses.forEach(course => {
                const course_lessons = {};
                course.lessons.forEach(lesson => {
                  const lesson_chapters = {};
                  let lesson_test = {};
                  lesson.chapters.forEach(chapter => {
                    allLessons.push(chapter.title);
                    lesson_chapters[chapter.title] = {
                      name: chapter.title,
                      type: chapter.type,
                      duration: chapter.duration,
                      link: chapter.link,
                    };
                  });

                  const lesson_test_questions = {};
                  if (lesson.test) {
                    lesson_test = {
                      test_id: lesson.test.test_id,
                      title: lesson.test.title,
                      timelimit: lesson.test.timeLimit,
                      questions: lesson_test_questions,
                    };
                    lesson.test.questions.forEach((question, index) => {
                      const options = [];
                      question.options.forEach((option) => {
                        options.push(option);
                      });
                      lesson_test_questions[index] = {
                        question: question.question,
                        options: options,
                        correctAnswer: question.correctAnswer,
                      };
                    });
                  }

                  course_lessons[lesson.title] = {
                    name: lesson.title,
                    description: lesson.description,
                    chapters: lesson_chapters,
                    test: lesson_test,
                  };
                });

                degree_courses[course.course_id] = {
                  name: course.title,
                  id: course.course_id,
                  description: course.description,
                  lessons: course_lessons,
                };
              });
              setAllLessons(allchapters);
              setCoursesData(degree_courses);
              localStorage.setItem("degree_courses", JSON.stringify(degree_courses));
            }
          });
        } else {
          setFetchError(true);
          alert("User not logged in, Go to Profile page");
        }

        setIsLoading(false);
      } catch (err) {
        console.log(err);
        setIsLoading(false);
        setFetchError(true);
      }
    };
    fetchData();
  }, []);

  const resolveImagePath = (imagePath) => {
    if (
      imagePath &&
      (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
    ) {
      return imagePath;
    } else if (imagePath && imagePath.startsWith("base64")) {
      return imgd;
    } else {
      try {
        return require(`../Assets/Images/${imagePath}`);
      } catch (error) {
        return imgd;
      }
    }
  };

  const getLessonList = (lessons) => {
    let lessonList = [];

    for (const lessonName in lessons) {
      const lesson = lessons[lessonName];
      lessonList.push(lesson);
    }
    return lessonList;
  };

  const filterCourses = (filters) => {
    try {
      if (filters.length === 0) {
        return coursesData;
      } else {
        return coursesData.filter((course) =>
          course.lessons.some((lesson) => filters.includes(lesson.title))
        );
      }
    } catch (err) {
      console.log(err);
      setFetchError(true);
      return [];
    }
  };

  const handleFilterClick = (filter) => {
    if (selectedFilters.includes(filter)) {
      setSelectedFilters(selectedFilters.filter((f) => f !== filter));
    } else {
      setSelectedFilters([...selectedFilters, filter]);
    }
  };

  const clearFilters = () => {
    setSelectedFilters([]);
  };

  const truncateDescription = (description) => {
    const words = description.split(" ");
    const truncated = words.slice(0, 15).join(" ");
    return truncated;
  };

  if (isLoading) {
    return (
      <div>
        <LoadingPage />
      </div>
    );
  }

  if (fetchError) {
    return <ErrorDataFetchOverlay />;
  }

  return (
    <>
      <div className="main-content">
        <div className="cardContainer3">
          <h2>Courses</h2>
          <div className="filterChips">
            {allLessons.map((lesson, index) => (
              <div
                key={index}
                className={`filterChip ${
                  selectedFilters.includes(lesson) ? "active" : ""
                }`}
                onClick={() => handleFilterClick(lesson)}
              >
                {lesson}
              </div>
            ))}
            {selectedFilters.length > 0 && (
              <button className="clearFilters" onClick={clearFilters}>
                Clear All
              </button>
            )}
          </div>
          <div className="courseContainer3">
            {Object.values(filterCourses(selectedFilters)).map((course) => (
              <div className="courseCard3" key={course.id}>
                <div className="courseOverlay3">
                  <div className="courseImageBox3">
                    <img
                      src={resolveImagePath(course.image)}
                      alt={course.name}
                      className="courseImage3"
                    />
                    <div className="courseImageTxt3">{course.name}</div>
                  </div>
                  <div className="courseDetails3">
                    <p>{truncateDescription(course.description)}...</p>
                    <button className="courseDetailBtn3">View Details</button>
                  </div>
                </div>
                <div className="courseLessonBox3">
                  <h5>Lessons</h5>
                  <ul>
                    {getLessonList(course.lessons).map((lesson, index) => (
                      <li key={index}>{lesson.name}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() =>
                      navigate(`/home/courseDetails/${course.id}`)
                    }
                    className="lessonDetailBtn3"
                  >
                    View Course
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Courses;
