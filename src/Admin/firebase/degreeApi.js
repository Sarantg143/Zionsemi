import { db, storage } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { uploadToVimeo } from './externalServices';
import { v4 as uuidv4 } from 'uuid';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';


// Upload file
export const uploadFile = async (file, type) => {
  let fileURL = '';
  try {
    if (type === 'video') {
      fileURL = await uploadToVimeo(file);
    } else if (['image', 'document', 'pdf', 'ppt'].includes(type)) {
      const fileRef = ref(storage, `${type}s/${uuidv4()}_${file.name}`);
      await uploadBytes(fileRef, file);
      fileURL = await getDownloadURL(fileRef);
      console.log('File uploaded to Firebase Storage, URL:', fileURL);
    }
    return fileURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('File upload failed');
  }
};

// Add new test for lessons or end of the course 
const createTestObject = (testData) => {
  return {
    test_id: uuidv4(),
    title: testData.title,
    timeLimit: testData.timeLimit,
    type: testData.type, // quiz or paragraph
    questions: testData.questions.map((question) => ({
      question: question.question,
      options: question.options || null,  
      correctAnswer: question.correctAnswer || null, 
    })),
  };
};

// Add Degree with courses, lessons, and tests
export const addDegree = async (degreeData) => {
  try {
    const degreeId = uuidv4();
    const courses = await Promise.all(degreeData.courses.map(async (course) => {
      let thumbnailUrl = '';
      if (course.thumbnail) {
        thumbnailUrl = await uploadFile(course.thumbnail, 'image');
      }

      const courseLessons = await Promise.all(course.lessons.map(async (lesson) => {
        const lessonChapters = await Promise.all(lesson.chapters.map(async (chapter) => {
          return {
            chapter_id: uuidv4(),
            title: chapter.title,
            type: chapter.type,
            link: chapter.link,
            duration: chapter.duration,
          };
        }));

        let lessonTest = null;
        if (lesson.test) {
          lessonTest = createTestObject(lesson.test); 
        }

        return {
          lesson_id: uuidv4(),
          title: lesson.title,
          description: lesson.description,
          chapters: lessonChapters,
          test: lessonTest, // Add the test to each lesson
        };
      }));

      let finalTest = null;
      if (course.finalTest) {
        finalTest = createTestObject(course.finalTest); // Create a final test for the course
      }

      return {
        course_id: uuidv4(),
        title: course.title,
        overviewPoints: course.overviewPoints,
        description: course.description,
        image: course.image || '',
        lessons: courseLessons,
        header: course.header || '',
        videoUrl: course.videoUrl || '',
        finalTest: finalTest, // Add the final test to the course
      };
    }));

    await addDoc(collection(db, 'degrees'), {
      id: degreeId,
      degree_title: degreeData.degree_title,
      description: degreeData.description,
      price: degreeData.price,
      thumbnail: degreeData.thumbnail || null,
      courses,
      createdAt: Date.now(),
    });

    console.log('Degree with courses, lessons, and tests successfully saved to Firestore!');
    return degreeId;
  } catch (error) {
    console.error('Error saving degree:', error);
    return null;
  }
};

// Edit Degree
export const editDegree = async (degreeId, degreeData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    await updateDoc(degreeRef, { ...degreeData, updatedAt: Date.now() });
    console.log('Degree updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating degree:', error);
    return false;
  }
};

// Delete Degree
export const deleteDegree = async (degreeId) => {
  try {
    await deleteDoc(doc(db, 'degrees', degreeId));
    console.log('Degree deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting degree:', error);
    return false;
  }
};

// Add Lesson to a Course
export const addLessonToCourse = async (degreeId, courseId, lessonData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = await Promise.all(degreeData.courses.map(async (course) => {
      if (course.course_id === courseId) {
        const newLesson = {
          lesson_id: uuidv4(),
          title: lessonData.title,
          description: lessonData.description,
          chapters: await Promise.all(lessonData.chapters.map(async (chapter) => {
            return {
              title: chapter.title,
              type: chapter.type,
              link: chapter.file ? await uploadFile(chapter.file, chapter.type) : '',
              duration: chapter.duration,
            };
          })),
        };

        if (lessonData.test) {
          newLesson.test = createTestObject(lessonData.test); // Add test to new lesson
        }

        return {
          ...course,
          lessons: [...(course.lessons || []), newLesson],
        };
      }
      return course;
    }));

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Lesson successfully added to course!');
    return true;
  } catch (error) {
    console.error('Error adding lesson:', error);
    return false;
  }
};

// Add Chapter to a Lesson
export const addChapterToLesson = async (degreeId, courseId, lessonId, chapterData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = await Promise.all(degreeData.courses.map(async (course) => {
      if (course.course_id === courseId) {
        const updatedLessons = await Promise.all(course.lessons.map(async (lesson) => {
          if (lesson.lesson_id === lessonId) {
            const newChapter = {
              chapter_id: uuidv4(),
              title: chapterData.title,
              type: chapterData.type,
              link: chapterData.file ? await uploadFile(chapterData.file, chapterData.type) : '',
              duration: chapterData.duration,
            };

            return {
              ...lesson,
              chapters: [...(lesson.chapters || []), newChapter],
            };
          }
          return lesson;
        }));

        return { ...course, lessons: updatedLessons };
      }
      return course;
    }));

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Chapter added successfully!');
    return true;
  } catch (error) {
    console.error('Error adding chapter:', error);
    return false;
  }
};


//  Edit Course
export const editCourse = async (degreeId, courseId, updatedCourseData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map((course) =>
      course.course_id === courseId
        ? { ...course, ...updatedCourseData, updatedAt: Date.now() }
        : course
    );

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Course updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating course:', error);
    return false;
  }
};

// Delete Course
export const deleteCourse = async (degreeId, courseId) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.filter((course) => course.course_id !== courseId);

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Course deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting course:', error);
    return false;
  }
};

//  Edit Lesson
export const editLesson = async (degreeId, courseId, lessonId, updatedLessonData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map((course) => {
      if (course.course_id === courseId) {
        const updatedLessons = course.lessons.map((lesson) =>
          lesson.lesson_id === lessonId
            ? { ...lesson, ...updatedLessonData, updatedAt: Date.now() }
            : lesson
        );
        return { ...course, lessons: updatedLessons };
      }
      return course;
    });

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Lesson updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating lesson:', error);
    return false;
  }
};

// Delete Lesson
export const deleteLesson = async (degreeId, courseId, lessonId) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map((course) => {
      if (course.course_id === courseId) {
        const updatedLessons = course.lessons.filter((lesson) => lesson.lesson_id !== lessonId);
        return { ...course, lessons: updatedLessons };
      }
      return course;
    });

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Lesson deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return false;
  }
};

//  Edit Chapter
export const editChapter = async (degreeId, courseId, lessonId, chapterId, updatedChapterData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map((course) => {
      if (course.course_id === courseId) {
        const updatedLessons = course.lessons.map((lesson) => {
          if (lesson.lesson_id === lessonId) {
            const updatedChapters = lesson.chapters.map((chapter) =>
              chapter.title === chapterId ? { ...chapter, ...updatedChapterData, updatedAt: Date.now() } : chapter
            );
            return { ...lesson, chapters: updatedChapters };
          }
          return lesson;
        });
        return { ...course, lessons: updatedLessons };
      }
      return course;
    });

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Chapter updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating chapter:', error);
    return false;
  }
};

//  Delete Chapter
export const deleteChapter = async (degreeId, courseId, lessonId, chapterId) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map((course) => {
      if (course.course_id === courseId) {
        const updatedLessons = course.lessons.map((lesson) => {
          if (lesson.lesson_id === lessonId) {
            const updatedChapters = lesson.chapters.filter((chapter) => chapter.title !== chapterId);
            return { ...lesson, chapters: updatedChapters };
          }
          return lesson;
        });
        return { ...course, lessons: updatedLessons };
      }
      return course;
    });

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Chapter deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return false;
  }
};

// Edit Test 
export const editTest = async (degreeId, courseId, lessonId, testId, updatedTestData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map((course) => {
      if (course.course_id === courseId) {
        const updatedLessons = course.lessons.map((lesson) => {
          if (lesson.lesson_id === lessonId && lesson.test?.test_id === testId) {
            lesson.test = { ...lesson.test, ...updatedTestData, updatedAt: Date.now() };
          }
          return lesson;
        });

        if (course.finalTest?.test_id === testId) {
          course.finalTest = { ...course.finalTest, ...updatedTestData, updatedAt: Date.now() };
        }

        return { ...course, lessons: updatedLessons };
      }
      return course;
    });

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Test updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating test:', error);
    return false;
  }
};

// Delete Test 
export const deleteTest = async (degreeId, courseId, lessonId, testId) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map((course) => {
      if (course.course_id === courseId) {
        const updatedLessons = course.lessons.map((lesson) => {
          if (lesson.lesson_id === lessonId && lesson.test?.test_id === testId) {
            lesson.test = null; 
          }
          return lesson;
        });
        
        if (course.finalTest?.test_id === testId) {
          course.finalTest = null;
        }

        return { ...course, lessons: updatedLessons };
      }
      return course;
    });

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Test deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting test:', error);
    return false;
  }
};

// Get a degree by ID
export const getDegreeById = async (degreeId) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    if (degreeSnapshot.exists()) {
      const data = degreeSnapshot.data();
      console.log('Degree data retrieved:', data);
      return data;
    } else {
      console.log('No such degree found!');
      return null;
    }
  } catch (error) {
    console.error('Error getting degree:', error);
    return null;
  }
};

// Get all degrees
export const getAllDegrees = async () => {
  try {
    const degreesCollectionRef = collection(db, 'degrees');
    const degreesSnapshot = await getDocs(degreesCollectionRef);
    const degreesList = degreesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return degreesList;
  } catch (error) {
    console.error('Error getting all degrees:', error);
    return [];
  }
};
