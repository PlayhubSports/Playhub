'use client'

import { FeedList } from '@/components/feed/FeedList'

export default function FeedPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FeedList />
    </div>
  )
}
