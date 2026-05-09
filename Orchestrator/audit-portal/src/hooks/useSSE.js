import { useEffect, useRef, useState } from 'react'
import { BASE_URL } from '../api/client'

export default function useSSE() {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const sourceRef = useRef(null)
  const reconnectRef = useRef(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const connect = () => {
      if (cancelledRef.current) {
        return
      }

      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }

      if (sourceRef.current) {
        sourceRef.current.close()
      }

      const source = new EventSource(`${BASE_URL}/audit/stream`)
      sourceRef.current = source

      source.onopen = () => setConnected(true)

      source.onmessage = (event) => {
        if (!event.data) {
          return
        }

        try {
          const payload = JSON.parse(event.data)
          setEvents((current) => {
            const next = [payload, ...current.filter((entry) => entry?.request_id !== payload?.request_id)]
            return next.slice(0, 100)
          })
        } catch {
          // Ignore malformed events.
        }
      }

      source.onerror = () => {
        setConnected(false)
        source.close()

        if (cancelledRef.current) {
          return
        }

        reconnectRef.current = window.setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      cancelledRef.current = true
      setConnected(false)

      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
      }

      if (sourceRef.current) {
        sourceRef.current.close()
      }
    }
  }, [])

  return { events, connected }
}
