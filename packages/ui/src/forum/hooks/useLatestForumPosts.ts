import { useMemo } from 'react'

import { ForumPostOrderByInput } from '@/common/api/queries'
import { ActiveStatus } from '@/forum/hooks/useForumCategories'
import { useGetLatestForumPostsQuery } from '@/forum/queries'
import { asMember, Member } from '@/memberships/types'

export interface ForumPostWithThread {
  id: string
  createdAt: string
  updatedAt?: string
  author: Member
  text: string
  threadId: string
  thread: {
    id: string
    title: string
    categoryId: string
    categoryTitle: string
  }
}

export const useLatestForumPosts = (limit: number) => {
  const { data, loading } = useGetLatestForumPostsQuery({
    variables: {
      orderBy: [ForumPostOrderByInput.UpdatedAtDesc],
      limit: 50,
      where: {}
    },
  })
  console.log('data: ',data)

  const posts = useMemo(
    () =>
      data?.forumPosts.filter((post) =>
        post.thread.status.__typename == "ThreadStatusActive" &&
	post.thread.category.status.__typename == "CategoryStatusActive")
      .map((post) => ({
        id: post.id,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: asMember(post.author),
        text: post.text,
        threadId: post.threadId,
        thread: {
          id: post.thread.id,
          title: post.thread.title,
          categoryId: post.thread.categoryId,
          categoryTitle: post.thread.category.title,
        },
      })) ?? [],
    [data, loading]
  )

  return { posts, isLoading: loading }
}
