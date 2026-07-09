import { describe, expect, it } from 'vitest'
import { parseTmdbList } from '@/server/tmdb'

describe('parseTmdbList', () => {
  it('maps a well-formed payload', () => {
    const parsed = parseTmdbList({
      results: [
        {
          id: 693134,
          title: 'Dune: Part Two',
          poster_path: '/abc.jpg',
          release_date: '2024-02-27',
          vote_average: 8.2,
          original_language: 'en',
        },
      ],
    })
    expect(parsed).toEqual([
      {
        id: 693134,
        title: 'Dune: Part Two',
        posterPath: '/abc.jpg',
        releaseDate: '2024-02-27',
        voteAverage: 8.2,
        originalLanguage: 'en',
      },
    ])
  })

  it('drops entries missing an id or title instead of throwing', () => {
    const parsed = parseTmdbList({
      results: [{ id: 1, title: 'Ok' }, { id: 2 }, { title: 'No id' }],
    })
    expect(parsed.map((m) => m.id)).toEqual([1])
  })

  it('returns an empty list when the payload shape is unexpected', () => {
    expect(parseTmdbList({ unexpected: true })).toEqual([])
    expect(parseTmdbList(null)).toEqual([])
  })
})
