'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Response, Option, OptionWithResponses } from '@/types/database';
import * as demoStore from '@/lib/demoStore';

export function useRealtimeEvent(eventId: string) {
    const [options, setOptions] = useState<OptionWithResponses[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 初期データの取得
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            if (!isSupabaseConfigured) {
                // デモモード: ローカルストレージから取得
                const optionsData = demoStore.getOptions(eventId);
                const optionIds = optionsData.map(o => o.id);
                const responsesData = demoStore.getResponses(optionIds);

                const optionsWithResponses: OptionWithResponses[] = optionsData.map(option => ({
                    ...option,
                    responses: responsesData.filter(r => r.option_id === option.id),
                }));

                setOptions(optionsWithResponses);
                setError(null);
                setLoading(false);
                return;
            }

            // Supabaseモード
            const { data: optionsData, error: optionsError } = await supabase
                .from('options')
                .select('*')
                .eq('event_id', eventId)
                .order('date', { ascending: true })
                .order('start_time', { ascending: true });

            if (optionsError) throw optionsError;

            if (!optionsData || optionsData.length === 0) {
                setOptions([]);
                setLoading(false);
                return;
            }

            const { data: responsesData, error: responsesError } = await supabase
                .from('responses')
                .select('*')
                .in('option_id', optionsData.map(o => o.id));

            if (responsesError) throw responsesError;

            const optionsWithResponses: OptionWithResponses[] = optionsData.map(option => ({
                ...option,
                responses: (responsesData || []).filter(r => r.option_id === option.id),
            }));

            setOptions(optionsWithResponses);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    // リアルタイム購読（Supabase使用時のみ）
    useEffect(() => {
        fetchData();

        if (!isSupabaseConfigured) {
            // デモモードではポーリングで更新（500ms間隔）
            const interval = setInterval(fetchData, 500);
            return () => clearInterval(interval);
        }

        // Supabaseモード: リアルタイム購読
        const responsesChannel = supabase
            .channel(`responses-${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'responses',
                },
                (payload) => {
                    console.log('Response change:', payload);

                    if (payload.eventType === 'INSERT') {
                        const newResponse = payload.new as Response;
                        setOptions(prev =>
                            prev.map(opt =>
                                opt.id === newResponse.option_id
                                    ? { ...opt, responses: [...opt.responses, newResponse] }
                                    : opt
                            )
                        );
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedResponse = payload.new as Response;
                        setOptions(prev =>
                            prev.map(opt =>
                                opt.id === updatedResponse.option_id
                                    ? {
                                        ...opt,
                                        responses: opt.responses.map(r =>
                                            r.id === updatedResponse.id ? updatedResponse : r
                                        ),
                                    }
                                    : opt
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        const deletedResponse = payload.old as Response;
                        setOptions(prev =>
                            prev.map(opt => ({
                                ...opt,
                                responses: opt.responses.filter(r => r.id !== deletedResponse.id),
                            }))
                        );
                    }
                }
            )
            .subscribe();

        const optionsChannel = supabase
            .channel(`options-${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'options',
                    filter: `event_id=eq.${eventId}`,
                },
                (payload) => {
                    console.log('Option added:', payload);
                    const newOption = payload.new as Option;
                    setOptions(prev => {
                        if (prev.some(o => o.id === newOption.id)) return prev;
                        const updated = [...prev, { ...newOption, responses: [] }];
                        return updated.sort((a, b) => {
                            if (a.date !== b.date) return a.date.localeCompare(b.date);
                            return a.start_time.localeCompare(b.start_time);
                        });
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(responsesChannel);
            supabase.removeChannel(optionsChannel);
        };
    }, [eventId, fetchData]);

    return { options, loading, error, refetch: fetchData };
}
