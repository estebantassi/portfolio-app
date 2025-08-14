import axios from "../api/axios"

const getuserprofile = async (ids) => {

    let listtorequest = []
    let finallist = []

    for (const id of ids)
    {
        const olduserdata = JSON.parse(localStorage.getItem(parseInt(id, 10)))
        if (olduserdata == null || new Date(olduserdata.expires) <= new Date())
        {
            listtorequest.push(parseInt(id, 10))
        } else {
            finallist.push(olduserdata)
        }
    }

    let fetchedProfiles = []

    if (listtorequest.length > 0) {
        try {
            let response = await axios.get('/getuserprofile', {
                params: { id: ids.join(",") }
            })
            delete response.data.message

            const expires = new Date(Date.now() + 60 * 1000)

            for (const [key, profile] of Object.entries(response.data.profiles)) {
                localStorage.setItem(profile.id, JSON.stringify({ ...profile, expires }))
                fetchedProfiles.push(profile)
            }
        } catch {
            return null
        }
    }

    const allProfilesMap = new Map()

    for (const profile of [...finallist, ...fetchedProfiles]) {
        allProfilesMap.set(profile.id, profile)
    }

    const finalObject = ids.map(id => allProfilesMap.get(id)).filter(Boolean)

    return Array.from(finalObject)
}

export default getuserprofile