async list(params?: QueryParamsList, options?: ResourcesConfig): Promise<##__RESOURCE_RESPONSE_TYPE__##[]> {
	return this.resources.list({ type: ##__RESOURCE_CLASS__##.TYPE }, params, options)
}