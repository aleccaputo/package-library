import {
    CaseReducer,
    createSelector,
    createSlice,
    PayloadAction
} from '@reduxjs/toolkit';
import _ from 'lodash';
import StatusEnum from '../../constants/StatusEnum';
import ModelState, { IModelState } from '../../models/model-state';
import { IMetaSliceSelectors, ISlice, ISliceSelectors } from '../../types';
import { getISOStringWithOffset, logSlice, mapErrorToSerializableObject } from '../../utilities';

export type IModelSliceReducers <TSliceState, TModel, TStatusEnum, TError> = {
    hydrate: CaseReducer<TSliceState, PayloadAction<TModel>>;
    update: CaseReducer<TSliceState, PayloadAction<Partial<TModel>>>;
    set: CaseReducer<TSliceState, PayloadAction<TModel>>;
    reset: CaseReducer<TSliceState, PayloadAction>;
    setStatus: CaseReducer<TSliceState, PayloadAction<TStatusEnum>>;
    setError: CaseReducer<TSliceState, PayloadAction<TError | null>>;
}

export interface IModelSliceSelectors <
    TGlobalState,
    TModel,
    TStatusEnum extends keyof typeof StatusEnum = keyof typeof StatusEnum,
    TError extends Error = Error
    >
    extends
        ISliceSelectors<TGlobalState, IModelState<TModel, TStatusEnum, TError>>,
        IMetaSliceSelectors<TGlobalState, TStatusEnum, TError> {
}

export type IModelSlice<
    TGlobalState,
    TModel,
    TStatusEnum extends keyof typeof StatusEnum = keyof typeof StatusEnum,
    TError extends Error = Error
    > = ISlice<
            TGlobalState,
            IModelState<TModel, TStatusEnum, TError>,
            IModelSliceReducers<IModelState<TModel, TStatusEnum, TError>, TModel, TStatusEnum, TError>,
            IModelSliceSelectors<TGlobalState, TModel, TStatusEnum, TError>
            >

export interface ICreateModelSliceOptions<
    TGlobalState,
    TModel,
    TStatusEnum extends keyof typeof StatusEnum = keyof typeof StatusEnum,
    TError extends Error = Error
    > {
    name: string;
    selectSliceState: (state: TGlobalState) => IModelState<TModel, TStatusEnum, TError>;
    initialState?: Partial<IModelState<TModel, TStatusEnum, TError>>;
    debug?: boolean;
}

const createModelSlice = <
    TGlobalState,
    TModel,
    TStatusEnum extends keyof typeof StatusEnum = keyof typeof StatusEnum,
    TError extends Error = Error
    > (options: ICreateModelSliceOptions<TGlobalState, TModel, TStatusEnum, TError>): IModelSlice<TGlobalState, TModel, TStatusEnum, TError> => {
    type ISliceState = IModelState<TModel, TStatusEnum, TError>

    const { name, selectSliceState, initialState, debug } = options;

    // intentional, necessary with immer
    /* eslint-disable no-param-reassign */
    const setModelState = (state: ISliceState, model: TModel) => {
        state.model = model;
    };

    const setError = (state: ISliceState, error: TError | null) => {
        state.error = error === null ? null : mapErrorToSerializableObject(error) as TError;
    };

    const setStatus = (state: ISliceState, status: TStatusEnum) => {
        state.status = status;
    };

    const setLastModified = (state: ISliceState, lastModified: string | null) => {
        state.lastModified = lastModified;
    };

    const setLastHydrated = (state: ISliceState, lastHydrated: string | null) => {
        state.lastHydrated = lastHydrated;
    };
    /* eslint-enable no-param-reassign */

    const modifyState = (state: ISliceState, model: TModel) => {
        setModelState(state, model);
        // TODO: should not have a side effect: https://redux.js.org/style-guide/style-guide#reducers-must-not-have-side-effects
        setLastModified(state, getISOStringWithOffset());
    };

    const hydrateState = (state: ISliceState, model: TModel) => {
        setModelState(state, model);
        setLastModified(state, null);
        // TODO: should not have a side effect: https://redux.js.org/style-guide/style-guide#reducers-must-not-have-side-effects
        setLastHydrated(state, getISOStringWithOffset());
    };

    const initialSliceState = ModelState.create<TModel, TStatusEnum, TError>(initialState ?? {});

    const slice = createSlice<ISliceState, IModelSliceReducers<ISliceState, TModel, TStatusEnum, TError>>({
        name: name,
        initialState: initialSliceState,
        reducers: {
            hydrate: (state, action) => {
                hydrateState(state as ISliceState, action.payload);
            },
            update: (state, action) => {
                const newModel = _.merge(state.model, action.payload) as TModel;
                modifyState(state as ISliceState, newModel);
            },
            reset: () => initialSliceState,
            set: (state, action) => {
                modifyState(state as ISliceState, action.payload);
            },
            setError: (state, action) => {
                setError(state as ISliceState, action.payload);
            },
            setStatus: (state, action) => {
                setStatus(state as ISliceState, action.payload);
            }
        }
    });

    const selectors = {
        selectSliceState: createSelector(selectSliceState, (sliceState) => sliceState),
        selectStatus: createSelector(selectSliceState, (sliceState) => sliceState.status),
        selectError: createSelector(selectSliceState, (sliceState) => sliceState.error),
        selectLastModified: createSelector(selectSliceState, (sliceState) => sliceState.lastModified),
        selectLastHydrated: createSelector(selectSliceState, (sliceState) => sliceState.lastHydrated)
    };

    const modelSlice: IModelSlice<TGlobalState, TModel, TStatusEnum, TError> = {
        name: slice.name,
        reducer: slice.reducer,
        actions: slice.actions,
        selectors: selectors
    };

    if (debug) {
        logSlice(modelSlice, initialSliceState);
    }

    return modelSlice;
};

export default createModelSlice;
