export default async function handler(req, res) {
  const { path } = req.query
  
  if (!path) {
    return res.status(400).json({ error: 'Path is required' })
  }

  const apiPath = Array.isArray(path) ? path.join('/') : path

  try {
    const response = await fetch(`https://api.football-data.org/${apiPath}`, {
      headers: {
        'X-Auth-Token': process.env.VITE_API_KEY
      }
    })

    const data = await response.json()
    
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
    return res.status(response.status).json(data)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch data' })
  }
}
