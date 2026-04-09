import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const body = await request.json()
  const { action, pricing_rule_id, discount_amount, payment_method, notes } = body

  const supabase = createAdminClient()

  // Get current session
  const { data: session } = await supabase
    .from('ps_sessions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (action === 'pause') {
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Can only pause active sessions' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('ps_sessions')
      .update({ status: 'paused', paused_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('*, ps_units(name, type)')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to pause' }, { status: 500 })
    return NextResponse.json(data)
  }

  if (action === 'resume') {
    if (session.status !== 'paused' || !session.paused_at) {
      return NextResponse.json({ error: 'Can only resume paused sessions' }, { status: 400 })
    }
    const pauseDuration = Math.floor((Date.now() - new Date(session.paused_at).getTime()) / 1000)
    const { data, error } = await supabase
      .from('ps_sessions')
      .update({
        status: 'active',
        paused_at: null,
        total_paused_seconds: session.total_paused_seconds + pauseDuration,
      })
      .eq('id', params.id)
      .select('*, ps_units(name, type)')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to resume' }, { status: 500 })
    return NextResponse.json(data)
  }

  if (action === 'stop') {
    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 })
    }

    const now = new Date()
    let totalPaused = session.total_paused_seconds
    // If currently paused, add remaining pause time
    if (session.paused_at) {
      totalPaused += Math.floor((now.getTime() - new Date(session.paused_at).getTime()) / 1000)
    }

    const startedAt = new Date(session.started_at)
    const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000) - totalPaused
    const durationMinutes = Math.ceil(Math.max(elapsedSeconds, 0) / 60)

    // Calculate billing - use provided pricing_rule_id or session's default
    const ruleId = pricing_rule_id || session.pricing_rule_id
    let baseAmount = 0

    if (ruleId) {
      const { data: rule } = await supabase
        .from('ps_pricing_rules')
        .select('*')
        .eq('id', ruleId)
        .single()

      if (rule) {
        if (rule.rule_type === 'package' && rule.duration_minutes) {
          const packages = Math.ceil(durationMinutes / rule.duration_minutes)
          baseAmount = packages * rule.price
        } else {
          const hours = Math.ceil(durationMinutes / 60)
          baseAmount = hours * rule.price
        }
      }
    }

    const discountAmt = discount_amount || 0
    const finalAmount = Math.max(0, baseAmount - discountAmt)

    const { data, error } = await supabase
      .from('ps_sessions')
      .update({
        status: 'completed',
        paused_at: null,
        total_paused_seconds: totalPaused,
        ended_at: now.toISOString(),
        pricing_rule_id: ruleId,
        duration_minutes: durationMinutes,
        base_amount: baseAmount,
        discount_amount: discountAmt,
        final_amount: finalAmount,
        payment_method: payment_method || null,
        notes: notes || null,
      })
      .eq('id', params.id)
      .select('*, ps_units(name, type)')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to stop session' }, { status: 500 })

    // Mark unit as available
    await supabase
      .from('ps_units')
      .update({ status: 'available' })
      .eq('id', session.ps_unit_id)

    return NextResponse.json(data)
  }

  if (action === 'edit') {
    if (session.status !== 'completed') {
      return NextResponse.json({ error: 'Can only edit completed sessions' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (body.customer_name !== undefined) updates.customer_name = body.customer_name
    if (body.payment_method !== undefined) updates.payment_method = body.payment_method || null
    if (body.notes !== undefined) updates.notes = body.notes || null
    if (body.final_amount !== undefined) {
      updates.final_amount = body.final_amount
      updates.discount_amount = (session.base_amount || 0) - body.final_amount
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ps_sessions')
      .update(updates)
      .eq('id', params.id)
      .select('*, ps_units(name, type)')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('ps_sessions')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  return NextResponse.json({ success: true })
}
