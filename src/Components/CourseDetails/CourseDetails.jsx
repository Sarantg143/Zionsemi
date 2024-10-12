import React, { useState, useEffect } from "react";
import "./CourseDetails.css";
import tick from "../Assets/SVG/tick.svg";
import { useNavigate, useParams } from "react-router-dom";
import LoadingPage from "../LoadingPage/LoadingPage";
import Accordion from "react-bootstrap/Accordion";
import ErrorDataFetchOverlay from "../Error/ErrorDataFetchOverlay";
import ProgressBar from "../ProgressBar/ProgressBar";
import { getDegreeById } from "../../Admin/firebase/degreeApi"; // Import the API to fetch degree data

const CourseDetails = () => {
  const navigate = useNavigate();
  const { courseId } = useParams(); // This is passed in the URL
  const [userId, setUserId] = useState("");
  const [courseData, setCourseData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedID, setFetchedID] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);
  const [currentCourseData, setCurrentCourseData] = useState({});

  // nxt btn
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1);
  const [activeAccordion, setActiveAccordion] = useState(null);

  // progress
  const [completedExercises, setCompletedExercises] = useState(new Set());
  const [watchedVideoTitles, setWatchedVideoTitles] = useState([]);

  // api data
  const [completedUserData, setCompletedUserData] = useState([]);
  const count = 0;

  useEffect(() => {
    const userdata = JSON.parse(localStorage.getItem("userdata"));
    if (userdata?.id) {
      setUserId(userdata.id);
    } else {
      navigate("../../");
    }

    const fetchData = async () => {
      try {
        // Fetch degree data from Firestore
        const degreeData = await getDegreeById(userdata.applyingFor);
        
        if (degreeData) {
          const courseDataFromDegree = degreeData.courses.find(course => course.course_id === courseId);
          if (!courseDataFromDegree) {
            throw new Error("Course not found");
          }

          // Process course lessons and tests
          const lessons = courseDataFromDegree.lessons.map((lesson, index) => {
            const chapters = lesson.chapters.map((chapter) => ({
              title: chapter.title,
              type: chapter.type,
              link: chapter.link,
              duration: chapter.duration,
            }));

            let test = {};
            if (lesson.test) {
              const questions = lesson.test.questions.map((question) => ({
                question: question.question,
                answer: question.correctAnswer,
                options: question.options,
              }));
              test = {
                test_id: lesson.test.test_id,
                timelimit: lesson.test.timeLimit,
                title: lesson.test.title,
                questions: questions,
              };
            }

            return {
              title: lesson.title,
              description: lesson.description,
              chapter: chapters,
              test: test,
            };
          });

          const coursedata = {
            _id: courseDataFromDegree.course_id,
            title: courseDataFromDegree.title,
            description: courseDataFromDegree.description || "Description needed for course",
            lessons: lessons,
            videoUrl: courseDataFromDegree.videoUrl || "",
            image: courseDataFromDegree.image || "imagenotxt.png",
          };
          setCourseData(coursedata);
          setIsLoading(false);
        } else {
          throw new Error("Degree not found");
        }
      } catch (err) {
        console.error("Error fetching course details:", err);
        setIsLoading(false);
        setFetchError(true);
      }
    };

    fetchData();
  }, [courseId, navigate]);

  const handleLessonClick = (index) => {
    setActiveLesson(index === activeLesson ? null : index);
    setActiveAccordion(index === activeLesson ? null : index);
  };

  const calculateTotalDuration = (videos) => {
    let totalSeconds = 0;
    videos?.forEach((video) => {
      if (video.duration) {
        totalSeconds += video.duration;
      }
    });

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds}s`;
  };

  function convertToReadableDuration(duration) {
    if (!duration || duration === "0") {
      return "3mins+";
    }
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    return `${parseInt(minutes, 10)}m ${parseInt(seconds, 10)}s`;
  }

  const handleCurrentContent = (data, lessonIndex, exerciseIndex) => {
    const exerciseKey = `${lessonIndex}-${exerciseIndex}`;
    setCompletedExercises((prev) => {
      const updatedSet = new Set(prev);
      updatedSet.add(exerciseKey);
      return updatedSet;
    });

    setWatchedVideoTitles((prevTitles) => {
      const updatedTitles = new Set(prevTitles);
      updatedTitles.add(data.title);
      return Array.from(updatedTitles);
    });

    const modifiedData = {
      ...data,
      exerciseNo: exerciseIndex + 1,
      lessonNo: lessonIndex + 1,
    };
    setCurrentCourseData(modifiedData);
    setCurrentLessonIndex(lessonIndex);
    setCurrentVideoIndex(exerciseIndex);
    setActiveAccordion(lessonIndex);
  };

  const handleNext = async () => {
    if (courseData.lessons) {
      const currentLesson = courseData.lessons[currentLessonIndex];

      if (currentLessonIndex === 0 && currentVideoIndex === -1) {
        handleCurrentContent(currentLesson.chapter[0], currentLessonIndex, 0);
      } else if (currentVideoIndex < currentLesson.chapter.length - 1) {
        handleCurrentContent(
          currentLesson.chapter[currentVideoIndex + 1],
          currentLessonIndex,
          currentVideoIndex + 1
        );
      } else if (currentLessonIndex < courseData.lessons.length - 1) {
        const nextLesson = courseData.lessons[currentLessonIndex + 1];
        handleCurrentContent(nextLesson.chapter[0], currentLessonIndex + 1, 0);
      } else {
        const totalExercises = courseData.lessons.reduce(
          (total, lesson) => total + lesson.chapter.length,
          0
        );
        if (completedExercises.size === totalExercises) {
          alert("Congratulations! You have completed the course!");
        } else {
          alert("There are a few lessons you need to complete!");
        }
      }
    }
  };

  const renderContent = (link, typeManual) => {
    if (typeManual === "video") {
      return (
        <iframe
          title={currentCourseData.title || "Video Title"}
          className="embed-responsive-item"
          sandbox="allow-forms allow-scripts allow-same-origin allow-presentation"
          src={`https://player.vimeo.com/video/${link.split("/").pop()}`}
          style={{ width: "100%", height: "100%" }}
          allow="autoplay; encrypted-media"
        ></iframe>
      );
    } else if (typeManual === "ppt") {
      return (
        <iframe
          title="PPT"
          className="embed-responsive-item"
          src={link}
          style={{ width: "100%", height: "100%" }}
          allow="autoplay; encrypted-media"
        ></iframe>
      );
    }
  };

  const calculateProgress = () => {
    const totalExercises = courseData.lessons?.reduce(
      (total, lesson) => total + lesson.chapter?.length,
      0
    );
    const progress =
      totalExercises > 0 ? (completedExercises.size / totalExercises) * 100 : 0;

    return progress;
  };

  const truncateText = (text, maxLength) => {
    if (text.length > maxLength) {
      return text.slice(0, maxLength) + "...";
    }
    return text;
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (fetchError) {
    return <ErrorDataFetchOverlay />;
  }

  return (
    <div className="courseContentContainer">
      <div className="row firstRow g-0">
        <div className="courseContentHeader">
          <button className="BackBtn" onClick={() => navigate(-1)}>
            Back
          </button>
          <div className="courseHeading">
            {truncateText(courseData.title, 45)}
          </div>
          <button className="NextBtn" onClick={() => handleNext()}>
            Next
          </button>
        </div>
        <div className="courseContentProgressBar">
          <ProgressBar progress={calculateProgress()} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-evenly" }} className="row secondRow">
        <div style={{ width: "70%" }} className="col-md-8 pdy">
          <div className="videoBox">
            <div style={{ height: "70vh" }} className="embed-responsive embed-responsive-16by9">
              {courseData?.lessons.length > 0 &&
                renderContent(
                  !currentCourseData.link ? courseData.videoUrl : currentCourseData.link,
                  !currentCourseData.link ? "video" : currentCourseData.type
                )}
            </div>
            <div>
              <div className="infoBox">
                <h1>{courseData.title}</h1>
                {courseData.lessons && courseData.lessons.length > 0 && (
                  <div className="lessonDescriptionBox">
                    <h3 className="lessonDescriptionBoxTitle">
                      {!currentCourseData.title
                        ? ""
                        : `${currentCourseData.lessonNo}.${currentCourseData.excerciseNo}`}{" "}
                      {!currentCourseData.title
                        ? courseData.lessons[0].title
                        : currentCourseData.title}
                    </h3>
                    <p className="lessonDescriptionBoxDescription">
                      {!currentCourseData.notes
                        ? courseData.lessons[0].description
                        : currentCourseData.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div style={{ width: "25%" }} className="col-md-4 CCaccordianBox">
          <Accordion activeKey={activeAccordion} onSelect={handleLessonClick}>
            {courseData?.lessons &&
              courseData.lessons?.map((lesson, index) => {
                const lessonCompleted = lesson.chapter?.every((_, vidIndex) =>
                  completedExercises.has(`${index}-${vidIndex}`)
                );

                return (
                  <Accordion.Item key={index} eventKey={index}>
                    <Accordion.Header
                      onClick={() => handleLessonClick(index)}
                      className={
                        !currentCourseData.title
                          ? ""
                          : `${currentCourseData.lessonNo === index + 1 ? "accr-btn-active" : ""}`
                      }
                    >
                      <div className="CClesson-meta">
                        <div className="CClesson-title">
                          <div>
                            {index + 1}&nbsp;.&nbsp;{lesson.title}
                          </div>

                          {lessonCompleted && (
                            <img className="content-watched" src={tick} alt="watched" />
                          )}
                        </div>
                        <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
                          <span className="lesson-duration">
                            {calculateTotalDuration(lesson?.chapter)}{" "}
                          </span>
                          <span className="lesson-duration">{lesson.chapter?.length}</span>
                        </div>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body>
                      <div>
                        <ul className="list-group">
                          {lesson.chapter?.map((video, vidIndex) => (
                            <li
                              key={vidIndex}
                              className={`list-group-item 
                              ${
                                currentCourseData.title === video.title
                                  ? "list-group-item-active"
                                  : completedExercises.has(`${index}-${vidIndex}`)
                                  ? "completedLesson"
                                  : ""
                              }`}
                              onClick={() => handleCurrentContent(video, index, vidIndex)}
                            >
                              <span className="video-number">
                                <div>
                                  {`${index + 1}.${vidIndex + 1}`}&nbsp;
                                  {video.title}
                                </div>

                                {completedExercises.has(`${index}-${vidIndex}`) && (
                                  <img className="content-watched" src={tick} alt="watched" />
                                )}
                              </span>
                              {video?.type === "video" ? (
                                <span className="lesson-duration">
                                  Duration : {convertToReadableDuration(video.duration)}
                                </span>
                              ) : (
                                <span className="lesson-duration">Type : {video?.type}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                        {Object.values(lesson.test).length > 0 && (
                          <div className="testButtonBox">
                            <div className="testButtonInr">
                              <div className="testButtonTxt">Take a Test to Confirm Your Understanding</div>

                              <button
                                className="testButton"
                                onClick={() => {
                                  localStorage.setItem("testdata", JSON.stringify(lesson.test));
                                  navigate(`/home/tests/${lesson.test.test_id}/user/${userId}`);
                                }}
                              >
                                Take Test
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                );
              })}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;
