import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc, Firestore } from 'firebase/firestore';
import { db, storage } from './firebase'; 
import { uploadToVimeo } from './externalServices'; 
import { v4 as uuidv4 } from 'uuid';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'; 


export const uploadFile = async (file, type) => {
  let fileURL = '';
  try {
    if (type === 'video') {
      fileURL = await uploadToVimeo(file);
    } else if (type === 'image' || type === 'document' || type === 'pdf' || type === 'ppt') {
      //const fileRef = ref(storage, `documents/${uuidv4()}_${file.name}`);
      const fileRef = ref(storage, `${type}s/${uuidv4()}_${file.name}`);
      await uploadBytes(fileRef, file);  // Upload file to Firebase
      fileURL = await getDownloadURL(fileRef); 
      console.log('File uploaded to Firebase Storage, URL:', fileURL);
    }
    return fileURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('File upload failed');
  }
};


// Add Degree with courses
export const addDegree = async (degreeData) => {
  try {
    const degreeId = uuidv4(); 
    const courses = await Promise.all(degreeData.courses.map(async (course) => {
      let thumbnailUrl = '';
      if (course.thumbnail) {
        thumbnailUrl = await uploadFile(course.thumbnail, 'image');  // Upload  thumbnail
      }
    //const courses = degreeData.courses.map(course => ({
    //  ...course,
    return {
      courseId: uuidv4(),
      name: course.name,
      thumbnail: thumbnailUrl,
      createdAt: Date.now(),
    };
  }));

    await addDoc(collection(db, 'degrees'), {
      degreeId,
      name: degreeData.name,
      price: degreeData.price,
      courses,
      createdAt: Date.now(),
    });

    console.log('Degree with courses successfully saved to Firestore!');
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


// Add Course under a Degree
export const addCourseToDegree = async (degreeId, courseData) => {
  console.log('Adding Course under')
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const newCourse = {
      courseId: uuidv4(),
      name: courseData.name,
      description: courseData.description,
      createdAt: Date.now(),
    };
    await updateDoc(degreeRef, {
      courses: firebase.firestore.FieldValue.arrayUnion(newCourse),
    });
    console.log('Adding Course ...',newCourse)

    console.log('Course successfully added to degree!');
    return newCourse.courseId;
  } catch (error) {
    console.error('Error adding course:', error);
    return null;
  }
};

// Edit Course
export const editCourse = async (degreeId, courseId, updatedCourseData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map(course => 
      course.courseId === courseId
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

    const updatedCourses = degreeData.courses.filter(course => course.courseId !== courseId);

    await updateDoc(degreeRef, { courses: updatedCourses });
    console.log('Course deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting course:', error);
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
      if (course.courseId === courseId) {
        const newLesson = {
          lessonId: uuidv4(),
          name: lessonData.name,
          features: await Promise.all(lessonData.features.map(async (sublesson) => {
            let fileURL = '';
            if (sublesson.file) {
              fileURL = await uploadFile(sublesson.file, sublesson.type);  
            }
            return { ...sublesson, chapterId: uuidv4(), link: fileURL };
          })),
          createdAt: Date.now(),
        };
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
    return null;
  }
};

// Edit Lesson
export const editLesson = async (degreeId, courseId, lessonId, updatedLessonData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map(course => {
      if (course.courseId === courseId) {
        const updatedLessons = course.lessons.map(lesson => 
          lesson.lessonId === lessonId
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

    const updatedCourses = degreeData.courses.map(course => {
      if (course.courseId === courseId) {
        const updatedLessons = course.lessons.filter(lesson => lesson.lessonId !== lessonId);
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

// Add Chapter to a Lesson
export const addChapterToLesson = async (degreeId, courseId, lessonId, chapterData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = await Promise.all(degreeData.courses.map(async (course) => {
      if (course.courseId === courseId) {
        const updatedLessons = course.lessons.map(async (lesson) => {
          if (lesson.lessonId === lessonId) {
            const newChapter = {
              chapterId: uuidv4(),
              ...chapterData,
              link: chapterData.file ? await uploadFile(chapterData.file, chapterData.type) : '', // Use async here
            };
            return {
              ...lesson,
              features: [...(lesson.features || []), newChapter],
            };
          }
          return lesson;
        });
        return { ...course, lessons: await Promise.all(updatedLessons) };
      }
      return course;
    }));

    await updateDoc(degreeRef, { courses: updatedCourses });

    console.log('Chapter successfully added to lesson!');
    return true;
  } catch (error) {
    console.error('Error adding chapter:', error);
    return null;
  }
};

// Edit Chapter
export const editChapter = async (degreeId, courseId, lessonId, chapterId, updatedChapterData) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map(course => {
      if (course.courseId === courseId) {
        const updatedLessons = course.lessons.map(lesson => {
          if (lesson.lessonId === lessonId) {
            const updatedChapters = lesson.features.map(chapter => 
              chapter.chapterId === chapterId
                ? { ...chapter, ...updatedChapterData, updatedAt: Date.now() }
                : chapter
            );
            return { ...lesson, features: updatedChapters };
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

// Delete Chapter
export const deleteChapter = async (degreeId, courseId, lessonId, chapterId) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const degreeData = degreeSnapshot.data();

    const updatedCourses = degreeData.courses.map(course => {
      if (course.courseId === courseId) {
        const updatedLessons = course.lessons.map(lesson => {
          if (lesson.lessonId === lessonId) {
            const updatedChapters = lesson.features.filter(chapter => chapter.chapterId !== chapterId);
            return { ...lesson, features: updatedChapters };
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


// Fetch all degrees
export const getDegrees = async () => {
  try {
    const degreeData = await getDocs(collection(db, 'degrees'));
    const degrees = degreeData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return degrees;
  } catch (error) {
    console.error('Error getting degrees:', error);
  }
};

// Fetch all courses under a degree
export const getCoursesByDegree = async (degreeId) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    return degreeSnapshot.data().courses;
  } catch (error) {
    console.error('Error getting courses:', error);
  }
};

// Fetch all lessons under a course
export const getLessonsByCourse = async (degreeId, courseId) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const course = degreeSnapshot.data().courses.find(c => c.courseId === courseId);
    return course ? course.lessons : [];
  } catch (error) {
    console.error('Error getting lessons:', error);
  }
};

// Fetch all chapters under a lesson
export const getChaptersByLesson = async (degreeId, courseId, lessonId) => {
  try {
    const degreeRef = doc(db, 'degrees', degreeId);
    const degreeSnapshot = await getDoc(degreeRef);
    const course = degreeSnapshot.data().courses.find(c => c.courseId === courseId);
    if (course) {
      const lesson = course.lessons.find(l => l.lessonId === lessonId);
      return lesson ? lesson.features : [];
    }
    return [];
  } catch (error) {
    console.error('Error getting chapters:', error);
  }
};
