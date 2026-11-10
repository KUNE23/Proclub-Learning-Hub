import prisma from '../config/prisma.js'
import redisService from '../services/redisService.js'
import { CACHE_KEYS, CACHE_TTL } from '../config/cache.js'

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id

    const cacheKey = `${CACHE_KEYS.DASHBOARD_MEMBER}:${userId}`

    const cached = await redisService.getCache(cacheKey)

    if (cached) {
      return res.json(cached)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const courses = await prisma.course.findMany({
      where: {
        isDeleted: false
      },
      include: {
        modules: {
          where: {
            isDeleted: false
          },
          include: {
            lessons: {
              where: {
                isDeleted: false
              }
            }
          }
        }
      }
    })

    const coursesWithProgress = await Promise.all(
      courses.map(async (course) => {
        const lessons = course.modules.flatMap((module) => module.lessons)
        const totalLessons = lessons.length

        const lessonIds = lessons.map((lesson) => lesson.id)

        const userProgress = await prisma.userProgress.findMany({
          where: {
            userId,
            lessonId: {
              in: lessonIds
            }
          }
        })

        const completedLessons = userProgress.filter(
          (p) => p.status === 'COMPLETED'
        ).length

        const progressPercentage =
          totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

        return {
          id: course.id,
          title: course.title,
          description: course.description,
          progressPercentage: Math.round(progressPercentage),
          completedLessons,
          totalLessons,
          totalModules: course.modules.length
        }
      })
    )

    const response = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    courses: coursesWithProgress
  }

  await redisService.setCache(
    cacheKey,
    response,
    CACHE_TTL.DASHBOARD
  )

  return res.json(response)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export const getCourseModulesWithProgress = async (req, res) => {
 try {
  const userId = req.user.id
  const courseId = Number(req.params.courseId)

  if (Number.isNaN(courseId)) {
    return res.status(400).json({
      message: 'Invalid course ID'
    })
  }

  const cacheKey =
    `${CACHE_KEYS.COURSE_MODULES}:${courseId}:user:${userId}`

  const cached = await redisService.getCache(cacheKey)

  if (cached) {
    return res.json(cached)
  }

  const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          where: {
            isDeleted: false
          },
          include: {
            lessons: {
              where: {
                isDeleted: false
              },
              orderBy: {
                order: 'asc'
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!course) {
      return res.status(404).json({ message: 'Course not found' })
    }

    const modulesWithProgress = await Promise.all(
      course.modules.map(async (module) => {
        const lessons = await Promise.all(module.lessons.map(async (lesson) => {
          const userProgress = await prisma.userProgress.findUnique({
            where: {
              userId_lessonId: {
                userId,
                lessonId: lesson.id
              }
            }
          })

          return {
            id: lesson.id,
            title: lesson.title,
            content: lesson.content,
            order: lesson.order,
            type: lesson.type,
            progress: {
              status: userProgress?.status || 'LOCKED',
              score: userProgress?.score || null
            }
          }
        }))

        return {
          id: module.id,
          title: module.title,
          description: module.description,
          order: module.order,
          lessons
        }
      })
    )

      const response = {
      course: {
        id: course.id,
        title: course.title,
        description: course.description
      },
      modules: modulesWithProgress
    }

    await redisService.setCache(
      cacheKey,
      response,
      CACHE_TTL.COURSE
    )

    return res.json(response)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const getDashboardAnalytics = async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.DASHBOARD_ADMIN

    const cached = await redisService.getCache(cacheKey)

    if (cached) {
      return res.status(200).json(cached)
    }
    const totalUsers = await prisma.user.count()

    const totalCourses = await prisma.course.count({
      where: {
        isDeleted: false
      }
    })

    const totalModules = await prisma.module.count({
      where: {
        isDeleted: false
      }
    })

    const totalLessons = await prisma.lesson.count({
      where: {
        isDeleted: false
      }
    })

    const completedProgress = await prisma.userProgress.count({
      where: {
        status: 'COMPLETED'
      }
    })

    const totalProgress = await prisma.userProgress.count()

    const averageProgress =
      totalProgress > 0
        ? Math.round((completedProgress / totalProgress) * 100)
        : 0

    const latestActivities = await prisma.userProgress.findMany({
      take: 8,
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        user: true,
        lesson: {
          include: {
            module: {
              include: {
                course: true
              }
            }
          }
        }
      }
    })

    const recentActivities = latestActivities.map(item => ({
      id: item.id,
      user: item.user.name,
      lesson: item.lesson.title,
      module: item.lesson.module.title,
      course: item.lesson.module.course.title,
      status: item.status,
      score: item.score || 0,
      updatedAt: item.updatedAt
    }))

    const engagement = await prisma.user.findMany({
      include: {
        progress: {
          include: {
            lesson: {
              include: {
                module: {
                  include: {
                    course: true
                  }
                }
              }
            }
          }
        }
      }
    })

    const engagementData = engagement.map(user => {
      const totalLessonsUser = user.progress.length

      const completedLessons = user.progress.filter(
        p => p.status === 'COMPLETED'
      ).length

      const percentage =
        totalLessonsUser > 0
          ? Math.round((completedLessons / totalLessonsUser) * 100)
          : 0

      return {
         id: user.id,
        name: user.name,
        email: user.email,
        completedLessons,
        totalLessons: totalLessonsUser,
        percentage
      }
    })

    const response = {
    status: 'success',
    data: {
      statistics: {
        totalUsers,
        totalCourses,
        totalModules,
        totalLessons,
        averageProgress
      },
      engagement: engagementData,
      recentActivities
    }
}

await redisService.setCache(
  cacheKey,
  response,
  CACHE_TTL.DASHBOARD
)

return res.status(200).json(response)
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
}

