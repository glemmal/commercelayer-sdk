/**
 * ©2021 Commerce Layer Inc.
 * Source code generated automatically by SDK codegen from OpenAPI schema 2.3.0
 * Generation date: 22-07-2021
 **/

import { ApiResource, Resource, ResourceCreate, ResourcesConfig, ResourceId } from '../resource'
import { /* QueryBuilderRetrieve, QueryBuilderList, */QueryParamsList, QueryParamsRetrieve } from '../query'





interface Import extends Resource {
	
	resource_type?: string
	parent_resource_id?: string
	status?: string
	started_at?: string
	completed_at?: string
	interrupted_at?: string
	inputs?: object[]
	inputs_size?: number
	errors_count?: number
	warnings_count?: number
	destroyed_count?: number
	processed_count?: number
	errors_log?: object[]
	warnings_log?: object[]
	cleanup_records?: boolean
	
}


interface ImportCreate extends ResourceCreate {
	
	resource_type: string
	parent_resource_id: string
	inputs: object[]
	cleanup_records?: boolean
	
}


class Imports extends ApiResource {

	static readonly TYPE: 'imports' = 'imports'
	// static readonly PATH = 'imports'

	async list(params?: QueryParamsList, options?: ResourcesConfig): Promise<Import[]> {
		return this.resources.list({ type: Imports.TYPE }, params, options)
	}

	async create(resource: ImportCreate, options?: ResourcesConfig): Promise<Import> {
		return this.resources.create(Object.assign(resource, { type: Imports.TYPE }) , options)
	}

	async retrieve(id: string, params?: QueryParamsRetrieve, options?: ResourcesConfig): Promise<Import> {
		return this.resources.retrieve<Import>({ type: Imports.TYPE, id }, params, options)
	}

	async delete(id: string, options?: ResourcesConfig): Promise<void> {
		this.resources.delete({ type: Imports.TYPE, id }, options)
	}


	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
	isImport(resource: any): resource is Import {
		return resource.type && (resource.type === Imports.TYPE)
	}

	/*
	filter(): QueryBuilderRetrieve {
		return new QueryBuilderRetrieve(Imports.TYPE)
	}
	*/

	/*
	filterList(): QueryBuilderList {
		return new QueryBuilderList(Imports.TYPE)
	}
	*/

	relationship(id: string): ResourceId & { type: typeof Imports.TYPE } {
		return { id, type: Imports.TYPE }
	}

}


export default Imports

export { Import, ImportCreate }
