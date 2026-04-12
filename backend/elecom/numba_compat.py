try:
    import numba.core.caching as _caching
    from numba.core.dispatcher import Dispatcher
    from numba.np.ufunc.ufuncbuilder import UFuncDispatcher
    from numba.np.ufunc import wrappers as _ufunc_wrappers

    def _disable_caching(self):
        return None

    class _NullFunctionCache:
        def __init__(self, py_func):
            self.py_func = py_func

        def load_overload(self, sig, target_context):
            return None

        def save_overload(self, sig, cres):
            return None

    _caching.FunctionCache = _NullFunctionCache

    class _NullWrapperCache:
        def __init__(self, py_func):
            self.py_func = py_func

        def load(self, *args, **kwargs):
            return None

        def save(self, *args, **kwargs):
            return None

        def load_overload(self, *args, **kwargs):
            return None

        def save_overload(self, *args, **kwargs):
            return None

    _ufunc_wrappers.GufWrapperCache = _NullWrapperCache
    if hasattr(_ufunc_wrappers, "UFuncWrapperCache"):
        _ufunc_wrappers.UFuncWrapperCache = _NullWrapperCache
    Dispatcher.enable_caching = _disable_caching
    UFuncDispatcher.enable_caching = _disable_caching
except Exception:
    pass
