import { supabase } from '@/lib/supabase'

export async function POST(request) {
    try {
        const { user_id, league_id, ticker, azione, quantita, prezzo, p_and_l } = await request.json()

        const { data, error } = await supabase
            .from('transactions')
            .insert({
                user_id,
                league_id,
                ticker,
                azione,
                quantita,
                prezzo,
                p_and_l,
            })

        if (error) return Response.json({ error: error.message }, { status: 400 })
        return Response.json({ success: true, data })
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 })
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const league_id = searchParams.get('league_id')
        const user_id = searchParams.get('user_id')

        let query = supabase.from('transactions').select('*')

        if (league_id) query = query.eq('league_id', league_id)
        if (user_id) query = query.eq('user_id', user_id)

        const { data, error } = await query.order('timestamp', { ascending: false })

        if (error) return Response.json({ error: error.message }, { status: 400 })
        return Response.json(data)
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 })
    }
}