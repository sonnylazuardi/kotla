import { cities, City } from '@/utils/dataSources/cities'
import { createContext, FC, useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { AllTimeStats, DEFAULT_ALL_TIME_STATS, GameState } from './constants'
import { useAllTimeStats } from './hooks/useAllTimeStats'
import { useGameState } from './hooks/useGameState'
import {
  getTodayDateString,
  restoreNumberOfTheDay,
  storeNumberOfTheDay
} from './storage'
import { toast } from '@/lib/toast'

export type ModalState = 'help' | 'stats' | null

type KotlaContextValue = {
  cityOfTheDay: City
  isLoading: boolean
  hasError: boolean
  guesses: City[]
  guess: (cityName: string) => void
  gameState: GameState['state']
  allTimeStats: AllTimeStats
  modalState: ModalState
  closeModal: () => void
  openModal: (modalState: ModalState) => void
}

export const KotlaContext = createContext<KotlaContextValue>({
  cityOfTheDay: null as unknown as City,
  isLoading: true,
  hasError: false,
  guesses: [],
  guess: () => {},
  gameState: 'in_progress',
  allTimeStats: DEFAULT_ALL_TIME_STATS,
  modalState: null,
  closeModal: () => {},
  openModal: () => {}
})

export const MAX_GUESS_COUNT = 6

export const KotlaProvider: FC = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cityOfTheDay, setCityOfTheDay] = useState<City>(
    null as unknown as City
  )
  const [[gameState, setGameState], isGameStateInitialized] = useGameState()
  const [[allTimeStats, setAllTimeStats], isAllTimeStatsInitialized] =
    useAllTimeStats()

  const openModal = (newModalState: ModalState) => {
    setModalState(newModalState)
  }

  const guess = (cityName: string) => {
    if (!cityOfTheDay || !cityName) return

    const lowercasedCityName = cityName.toLowerCase()

    const city = cities.find(
      (city) => city.name.toLowerCase() === lowercasedCityName
    )

    if (!city) {
      toast.error('Kota tidak ada dalam daftar Kotla')

      return
    }

    if (
      gameState.guesses.find((c) => c.name.toLowerCase() === lowercasedCityName)
    ) {
      toast.error('Kota sudah ditebak sebelumnya')

      return
    }

    if (city.name === cityOfTheDay.name) {
      setGameState((prev) => {
        const guessCount = prev.guesses.length + 1
        setAllTimeStats((prev) => {
          const isLongestStreak = prev.currentStreak === prev.longestStreak

          return {
            ...prev,
            guessDistribution: prev.guessDistribution.map(([guess, count]) =>
              guessCount === guess ? [guess, count + 1] : [guess, count]
            ) as AllTimeStats['guessDistribution'],
            playCount: prev.playCount + 1,
            winCount: prev.winCount + 1,
            longestStreak: isLongestStreak
              ? prev.longestStreak + 1
              : prev.longestStreak,
            currentStreak: prev.currentStreak + 1
          }
        })

        return {
          ...prev,
          guesses: [...prev.guesses, city],
          state: 'won'
        }
      })

      if (gameState.guesses.length < 1) {
        toast.success('Curang kah?')
      } else if (gameState.guesses.length < 2) {
        toast.success('Sakti!')
      } else if (gameState.guesses.length <= 4) {
        toast.success('Tjakep!')
      } else if (gameState.guesses.length <= 5) {
        toast.success('Mantap')
      } else {
        toast.success('Nyaris')
      }

      setTimeout(() => {
        openModal('stats')
        confetti()
      }, 3000)
    } else if (gameState.guesses.length === MAX_GUESS_COUNT - 1) {
      setGameState((prev) => {
        return {
          ...prev,
          guesses: [...prev.guesses, city],
          state: 'lost'
        }
      })

      setAllTimeStats((prev) => {
        return {
          ...prev,
          playCount: prev.playCount + 1,
          currentStreak: 0
        }
      })

      toast.error(
        `Kesempatan habis. Kotla hari ini adalah: ${cityOfTheDay.name}`
      )

      setTimeout(() => {
        openModal('stats')
      }, 3000)
    } else {
      setGameState((prev) => {
        return {
          ...prev,
          guesses: [...prev.guesses, city],
          state: 'in_progress'
        }
      })
    }
  }

  useEffect(() => {
    if (isAllTimeStatsInitialized && allTimeStats.playCount === 0) {
      // Onboard new players
      openModal('help')
    }
  }, [allTimeStats, isAllTimeStatsInitialized])

  useEffect(() => {
    if (!cityOfTheDay) {
      const ds = getTodayDateString()

      ;(async () => {
        const { number, dateString } = await restoreNumberOfTheDay()

        if (number === -1 || dateString !== ds) {
          // Need to refetch from the server
          const res = await fetch(`/api/getNumberOfTheDay?ds=${ds}`)
          const json = await res.json()
          const { numberOfTheDay } = json
          const cityIndexOfTheDay = numberOfTheDay % cities.length

          setCityOfTheDay(cities[cityIndexOfTheDay])
          setIsLoading(false)

          storeNumberOfTheDay({
            number: numberOfTheDay,
            dateString: ds
          })
        } else {
          const cityIndexOfTheDay = number % cities.length

          setCityOfTheDay(cities[cityIndexOfTheDay])
          setIsLoading(false)
        }
      })()
    }
  }, [cityOfTheDay])

  return (
    <KotlaContext.Provider
      value={{
        cityOfTheDay,
        hasError: !cityOfTheDay && !isLoading,
        isLoading:
          isLoading || !isGameStateInitialized || !isAllTimeStatsInitialized,
        guesses: gameState.guesses,
        guess,
        gameState: gameState.state,
        allTimeStats,
        modalState,
        closeModal: () => {
          setModalState(null)
        },
        openModal
      }}
    >
      {children}
    </KotlaContext.Provider>
  )
}
