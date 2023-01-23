/*
    Code from: https://stackoverflow.com/questions/1296358/how-to-subtract-days-from-a-plain-date
*/
function calculateDayOffset(days) {
    const new_date = new Date(Date.now())
    new_date.setDate(new_date.getDate() + days)

    return new_date
}

async function unfriend(last_online_date, user_id) {
    const friend_to_unfriend = findFriendFromID(friends_list_data.data, user_id)
    const can_unfriend = confirm(`Are you shore you want to unfriend ${friend_to_unfriend.displayName} (@${friend_to_unfriend.displayName}) \n\n They are ${Math.floor(getDateDifference(new Date(Date.now()), cutoff_date, "day"))} days old`)
    
    // KILL THEM
    if (can_unfriend) {
        const unfriend_request = await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${friend_to_unfriend.id}/unfriend`, 'POST')

        if (unfriend_request.status != 200) { console.warn(`Could not unfriend @${friend_to_unfriend.name}`); return }
        else { console.log(`Successfully unfriended @${friend_to_unfriend.name}`)}
    }
    else {
        console.log(`DID NOT unfriend @${friend_to_unfriend.name}`)
    }
}

function getDateDifference(date1, date2, unit = "day") {
    // TODO: Add support for automatic "uniting"
    const date_difference = date2.getTime() - date1.getTime()

    let unit_deviser = 1

    if (unit instanceof Number) {
        unit_deviser = unit
    }
    else {
        switch (unit.toLowerCase()) {
            case 'day':
            case 'days':
                unit_deviser = 1000 * 3600 * 24
                break
            case 'month':
            case 'months':
                unit_deviser = 1000 * 3600 * 24 * 30
                break
            case 'year':
            case 'years':
                unit_deviser = 1000 * 3600 * 24 * 30 * 12
                break
        }
    }

    return date_difference / unit_deviser
}

function findFriendFromID(friend_list, id) {
    let found_friend = null
    friend_list.forEach(friend => {
        // We already found the friend, no need to keep checking!
        if (found_friend) { return }

        if (friend.id == id) {
            found_friend = friend
        }
    })

    return found_friend
}

/*
    // Code re-written from: https://devforum.roblox.com/t/accessing-the-roblox-api-the-comprehensive-tutorial/1161932
*/
async function fetchRobloxAPI(url = '', method = 'GET', data = {}) {
    // if it fails then it probably needs a X-CSRF token
    let response = await fetch(url, {
        method,
        credentials: 'include',
        ...data
    })

    method = method.toLowerCase()
    if (method == 'post' || method == 'put' || method == 'patch' || method == 'delete') {
        const csrfToken = response.headers.get('X-CSRF-TOKEN')
        
        // Retry /w the new X-CSRF token
        response = await fetch(url, {
            method,
            credentials: 'include',
            headers: {
                'X-CSRF-TOKEN': csrfToken
            },
            ...data
        })
    }

    return response
}
cutoff_offset_days = 120
cutoff_date = new Date(new Date().setFullYear(2022)) //calculateDayOffset(cutoff_offset_days)

console.log(cutoff_date)

async function main() {
    const current_user_response = await fetchRobloxAPI('https://users.roblox.com/v1/users/authenticated')
    const current_user_json = await current_user_response.json()

    if (current_user_response.status != 200) {
        console.warn('User is not logged In!')
        return current_user_json
    }

    // Get a list of all our friends
    const friends_list_response = await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${current_user_json.id}/friends`)
    const friends_list_data = await friends_list_response.json()
    
    const friend_ids_to_check = []

    friends_list_data.data.forEach(friend => {
        const user_created_date = new Date(friend.created)

        // INVALID DATE!
        if (user_created_date.getUTCFullYear() == 1) { return}
        // This account is younger then alloted time! (Optimization)
        else if (cutoff_date <= user_created_date) {
            console.log(`User @${friend.name} is to young. There is no point in checking them`)
            return
        }
        
        // Now we can check the last login date of the user
        friend_ids_to_check.push(friend.id)
    });

    const user_ids_to_check_json = JSON.stringify({userIds: friend_ids_to_check})
    const request_body = {
        headers: {
            'Content-Type': 'application/json'
        },
        body: user_ids_to_check_json
    } 

    // Check all the users at the same time (also optimization as we don't have to send up to 200 requests...)
    const last_online_response = await fetchRobloxAPI('https://presence.roblox.com/v1/presence/last-online', 'POST', request_body)
    const last_online_data = await last_online_response.json()

    // Check each user last login date, and purge them if they haven't played for a while
    last_online_data.lastOnlineTimestamps.forEach(async last_online_friend => {
        const last_online_date = new Date(last_online_friend.lastOnline)
        if (last_online_date <= cutoff_date) {
            unfriend()
        }
    })
    



    // https://presence.roblox.com/docs/index.html

    // const fetchRobloxAPI('https://friends.roblox.com/v1/users/522716763/unfriend', 'POST')
    //     .then((response) => {
    //         console.log(response.status, response)
    //     });
}

main()